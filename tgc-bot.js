const commands = require( './commands' );
const events = require( './events' );
const AuditSystem = require( "./audit-system" );
const express = require('express')
const app = express();
const moment = require( "moment" );
const config = require( "./config" );
const http = require( "http" );
app.use(express.json())

module.exports = class TGCBot{
  constructor( client, db, timers ){
    this.db = db;
    this.audit = new AuditSystem( this, this.db );
    this.timers = timers;
    this.client = client;
    this.events = [];
    this.compiledCommands = [];
    this.commands = {};
    this.welcomeList = [];
    this._SetupWebServerMethods();
    app.listen( 5630, () => console.log(`Web server listening on port 5630!`))

    this._setupTimers();
  }

  async _setupTimers(){
    this.timers.AddTimerMethod( "HourlyChat", async () => {
      await this._frequentMessage();
      await this.timers.AddDBTimer( "HourlyChat", moment().startOf( "hour" ).add( 1, "hours" ).valueOf() );
    });

    if( !(await this.timers.HasTimerMethod( "HourlyChat" )) ){
      this._frequentMessage();
      await this.timers.AddDBTimer( "HourlyChat", moment().startOf( "hour" ).add( 1, "hours" ).valueOf() );
    }
  }

  _SetupWebServerMethods(){
    this.AddWebMethod( "get", '/member/:userId', this._GetMemberData.bind( this ) );
    this.AddWebMethod( "get", '/members', this._GetMembers.bind( this ) );
    this.AddWebMethod( "post", '/ingame', this._PostInGameMessage.bind( this ) );
  }

  _GenerateResponse( res, data ){
    res.set('Content-Type', 'application/json');
    res.send( JSON.stringify( data ) );
  }

  AddWebMethod( requestMethod, path, method ){
    app[requestMethod]( path, async ( req, res ) => this._GenerateResponse( res, await method( req ) ) )
  }

  async _frequentMessage(){
    try{
      const optionChannel = this.GetChannelByName( "chat-blasts" );
      await this.SuperFetch( optionChannel, 1000 );
      const allMessages = optionChannel.messages.array();
      const message = allMessages[Math.floor(Math.random() * allMessages.length )];
      let content = message.content;
      await this._sendFrequentMessage( content.substring( 3, content.length - 3 ) )
    }
    catch( ex ){
      console.error( "Couldn't send frequent message", ex );
    }
  }

  async _sendFrequentMessage( content ){
    await this._postMessageToGame( {
      type: "chat",
      eventProperties: {
        message: content,
        type: "guild"
      }
    });
  }

  async _postMessageToGame( data ){
    data.token = config.webtoken;
    return new Promise( ( resolve, reject ) => {
      let request = http.request( {
        hostname: "tgcguild.com",
        port: 80,
        path: "/api/botEvents",
        method: 'POST',
        headers: {
          'Content-Type': "application/json",
          'Content-Length': JSON.stringify( data ).length
        }
      }, ( res ) => {
        res.setEncoding('utf8');
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          try {
            const parsedData = JSON.parse(rawData);
            resolve( parsedData );
          } catch (e) {
            console.error( rawData );
            reject( e );
          }
        });
      } ).on( 'error', ( e ) => {
        reject( e );
      });
      request.write( JSON.stringify( data ) );
      request.end();
    } );
  }

  async _PostInGameMessage( req ){
    let channel = null;
    if( req.body.type === "officer" ){
      channel = this.GetChannelByName( "in-game-officer-chatter" );
    }
    else if( req.body.type === "guild" ){
      channel = this.GetChannelByName( "in-game-chatter" );
    }
    channel.send( `**${req.body.user}:@${moment(req.body.timestamp).format("HH:mm")}**: ${req.body.message.replace( /`/gi, "\\`" )}` );
    return { success : true };
  }

  _GetMembers( req ){
    const guild = this.client.guilds.array()[0];
    return guild.members.array().map( member => {
      return {
        id : member.user.id,
        name : member.nickname || member.user.username
      };
    });
  }

  async _GetMemberData( req ){
    const guild = this.client.guilds.array()[0];
    const member = await guild.fetchMember( req.params.userId );
    return {
      roles : member.roles.array().map( role => role.name ),
      username : member.user.username + "#" + member.user.discriminator,
      userId : member.user.id,
      displayName : member.nickname || member.user.username
    };
  }

  async PerformSetup(){
    await this.audit.InitAudits();
    await this._SetupCommands();
    await this._SetupEvents();
    await this.SuperFetch( this.GetChannelByName( "bot-sayings" ), 1000 );
    console.log( "Event system is setup and running!" );
  }

  async _SetupCommands(){
    for( let i = 0; i < commands.length; i++ ){
      this.compiledCommands.push( await this._InitilizeNewCommand( new commands[i]( this, this.db, this.timers ) ) );
    }
  }

  async _SetupEvents(){
    for( let i = 0; i < events.length; i++ ){
      this.events.push( await this._InitilizeNewEvent( new events[i]( this, this.db, this.timers ) ) );
    }
  }

  async _InitilizeNewCommand( command ){
    await command.Init();

    const commandMethods = Object.getOwnPropertyNames( command.__proto__ );
    for( let i = 0; i < commandMethods.length; i++ ){
      if( !commandMethods[i].startsWith( "_" ) && commandMethods[i] !== "constructor" && commandMethods[i] !== "Init" ){
        this.commands[commandMethods[i].toLowerCase()] = { method : command[commandMethods[i]], object : command };
      }
    }
  }

  async _InitilizeNewEvent( event ){
    await event.Init();

    event.SetEventMethod( this.client.on( event.eventType, async function(){
      await event.Exec.apply( event, [ this, ...arguments ] );
    }.bind( this ) ) );
  }

  GetChannelByName( name ){
    return this.client.channels.filter( x => x.name && x.name.endsWith( name ) ).array()[0] || null;
  }

  GetUserByName( name ){
    return this.client.users.filter( x => x.username === name ).array();
  }

  GetUserById( id ){
    return this.client.users.filter( x => x.id === id ).array()[0] || null;
  }

  // fetch more messages just like Discord client does
  async SuperFetch(channel, limit) {
    // message cache is sorted on insertion
    // channel.messages[0] will get oldest message
    let messages = channel.messages.array();
    let eof = false;
    let sendAmount = 0;
    while( messages.length < limit && !eof ){
      console.log( channel.name, "request for data" );
      if( sendAmount * 100 > limit ){
        return channel.messages.array();
      }
      let before = channel.messages.lastKey();
      let newMessages = await channel.fetchMessages( { limit : 100, before } );
      if( newMessages.array().length === 0 ){
        eof = true;
      }
      messages = channel.messages.array();
      sendAmount++;
    }
    
    return messages;
  }

  async WriteMessage( channel, message ){
    if( typeof( channel ) === "string" ){
      channel = this.GetChannelByName( channel );
    }

    if( channel !== null ){
      return await channel.send( message );
    }
  }

  async DmUser( user, message, decayTimer = 30000, customFormatting = false ){
    let reply = null;
    if( customFormatting ){
      reply = await user.send( message );
    }
    else{
      reply = await user.send( "```" + message + ".```\n\n```This message will self destruct in " + ( decayTimer / 1000 ) + " seconds.```" );
    }
    
    this.timers.AddDBTimer( "DeleteDM", new Date().getTime() + decayTimer, { userId : user.id, messageId : reply.id } );
  }

};
