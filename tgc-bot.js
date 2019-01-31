const commands = require( './commands' );
const events = require( './events' );
const AuditSystem = require( "./audit-system" );
const express = require('express')
const app = express();
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
  }

  _SetupWebServerMethods(){
    this.AddWebMethod( "get", '/member/:userId', this._GetMemberData.bind( this ) );
    this.AddWebMethod( "get", '/members', this._GetMembers.bind( this ) );
    this.AddWebMethod( "get", '/ingame', this._PostInGameMessage.bind( this ) );
  }

  _GenerateResponse( res, data ){
    res.set('Content-Type', 'application/json');
    res.send( JSON.stringify( data ) );
  }

  AddWebMethod( requestMethod, path, method ){
    app[requestMethod]( path, async ( req, res ) => this._GenerateResponse( res, await method( req ) ) )
  }

  async _PostInGameMessage( req ){
    let channel = null;
    if( req.query.type === "officer" ){
      channel = this.GetChannelByName( "in-game-officer-chatter" );
    }
    else if( req.query.type === "guild" ){
      channel = this.GetChannelByName( "in-game-chatter" );
    }
    channel.send( `**${req.query.user}**: ${req.query.message.replace( /`/gi, "\\`" )}` );
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
    return this.client.channels.filter( x => x.name === name ).array()[0] || null;
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
    while( messages.length < limit && !eof ){
      let before = channel.messages.lastKey();
      let newMessages = await channel.fetchMessages( { limit : 100, before } );
      if( newMessages.array().length === 0 ){
        eof = true;
      }
      messages = channel.messages.array();
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