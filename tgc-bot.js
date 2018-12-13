const commands = require( './commands' );
const events = require( './events' );

module.exports = class TGCBot{
  constructor( client, db, timers ){
    this.db = db;
    this.timers = timers;
    this.client = client;
    this.events = [];
    this.compiledCommands = [];
    this.commands = {};
    this.welcomeList = [];
    
  }

  async PerformSetup(){
    await this._SetupCommands();
    await this._SetupEvents();
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
        this.commands[commandMethods[i]] = { method : command[commandMethods[i]], object : command };
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

  async WriteMessage( channel, message ){
    if( typeof( channel ) === "string" ){
      channel = this.GetChannelByName( channel );
    }

    if( channel !== null ){
      return await channel.send( message );
    }
  }

  async DmUser( user, message, decayTimer = 30000 ){
    const reply = await user.send( "```" + message + ".```\n\n```This message will self destruct in " + ( decayTimer / 1000 ) + " seconds.```" );
    this.timers.AddDBTimer( "DeleteDM", new Date().getTime() + decayTimer, { userId : user.id, messageId : reply.id } );
  }

};