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

  _SetupEventsd(){

    this._ListenForEvent( [ "*" ], [ "Event Coordinator" ], "createEvent", async ( user, message, name, text, day, time, anyRole = "1", tanks = "1", heals = "1", dps = "1", repeating = "true" ) => {
      repeating = repeating === "true";
      day = day.toLowerCase();
      if( this._ValidateList( user, "createEvent", day, "day", [ "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday" ] )
        && this._ValidateValue( user, "createEvent", time, "time", /^\d\d\:\d\d$/i )
        && this._ValidateValue( user, "createEvent", anyRole, "anyRole", /\d+/ ) && this._ValidateValue( user, "createEvent", tanks, "tanks", /\d+/ ) && this._ValidateValue( user, "createEvent", heals, "heals", /\d+/ ) && this._ValidateValue( user, "createEvent", dps, "dps", /\d+/ ) ){
        this._ServerReply( user, `Event '${name}' created, check guild-events.`  );
        const post = await this.WriteMessage( "guild-events", `Creating event...` );
        const eventData = {
          user : user.id,
          postId : post.id,
          name : name,
          text : text,
          day : this._DayToNumber( day ),
          groupSize : {
            tanks : parseInt( tanks ),
            heals : parseInt( heals ),
            dps : parseInt( dps ),
            anyRole : parseInt( anyRole )
          },
          hour : parseInt( time.split( ":" )[0] ),
          minute : parseInt( time.split( ":" )[1] ),
          minLevel : "0",
          signups : {
            tanks : [],
            heals : [],
            dps : [],
            anyRole : []
          },
          repeating
        };
        let eventPost = await this.eventDb.Insert( "events", eventData );
        this._UpdateEventPost( eventPost );
      }
    } );

    this._ListenForEvent( [ "*" ], [ "Event Coordinator" ], "updateEvent", ( user, message, id, field, value ) => {
      this._ServerReply( user, `Event updates are still a work in progress.`  );
    } );

    this._ListenForEvent( [ "*" ], [], "signup", async ( user, message, id, role = "any" ) => {
      let eventDetails = (await this.eventDb.Find( "events", { _id : new MongoId( id ) } ))[0] || null;
      role = role.toLowerCase();
      if( eventDetails !== null ){
        if( this._ValidateList( user, "signup", role, "role", [ "tank", "healer", "dps", "any" ] ) ){
          if( role === "any" ){
            role = "anyRole";
          }
          if( role === "healer" ){
            role = "heals";
          }
          if( [ "tanks", "dps", "anyRole", "heals" ].filter( x => eventDetails.signups[x].indexOf( user.id ) !== -1 ).length === 0 ){
            if( eventDetails.groupSize[role] > eventDetails.signups[role].length ){
              eventDetails.signups[role].push( user.id );
              await this.eventDb.Update( "events", { _id : eventDetails._id }, { $set : { signups : eventDetails.signups }} );
              this._ServerReply( user, `You have signed up for event ${eventDetails.name} as ${role}.` );
              this._UpdateEventPost( eventDetails );
            }
            else{
              this._ServerReply( user, `The event ${eventDetails.name} has all ${role} slots full.` );
            }
          }
          else{
            this._ServerReply( user, `You are already signup for the event ${eventDetails.name}, to change your roll you must resignup after removing your signup. With tgc cancelSignup \"Event Name\"` );
          }
        }
      }
      else{
        this._ServerReply( user, `Event not found ${id}.` );
      }
    } );

    this._ListenForEvent( [ "*" ], [], "cancelSignup", async ( user, message, id ) => {
      let eventDetails = (await this.eventDb.Find( "events", { _id : new MongoId( id ) } ))[0] || null;
      if( eventDetails !== null ){
        const signedUpRole = [ "tanks", "dps", "anyRole", "heals" ].filter( x => eventDetails.signups[x].indexOf( user.id ) !== -1 )[0] || null;
        if( signedUpRole !== null ){
          eventDetails.signups[signedUpRole].splice( eventDetails.signups[signedUpRole].indexOf( user.id ), 1 );
          await this.eventDb.Update( "events", { _id : eventDetails._id }, { $set : { signups : eventDetails.signups }} );
          this._ServerReply( user, `You signup for the event ${eventDetails.name} as ${signedUpRole} was canceled` );
          this._UpdateEventPost( eventDetails );
        }
        else{
          this._ServerReply( user, `You attempted to cancel a signup for the event ${eventDetails.name}, but you were not signed up.` );
        }
      }
      else{
        this._ServerReply( user, `Event not found ${id}.` );
      }
    } );
  }

  GetChannelByName( name ){
    return this.client.channels.filter( x => x.name === name ).array()[0] || null;
  }

  GetUserByName( name ){
    return this.client.users.filter( x => x.username === name ).array();
  }

  async WriteMessage( channel, message ){
    if( typeof( channel ) === "string" ){
      channel = this.GetChannelByName( channel );
    }

    if( channel !== null ){
      return await channel.send( message );
    }
  }

  _ListenForEvent( supportedChannels, requiredRoles, command, method ){
    this.events[command] = {
      supportedChannels,
      requiredRoles,
      method
    };
  }

  _SetupMessageListeners(){
    this.client.on( "message", async ( message ) => {
      if( message.content.startsWith( "tgc" ) ){
        await message.delete();
        let messageBody = this.ExtractArguments( message.content.substring( 4 ) );
        let messageCommand = messageBody[0] || "unknown";
        messageBody.splice( 0, 1 );
        if( this.events[messageCommand] ){
          const command = this.events[messageCommand];
          if( command.supportedChannels.filter( x => x === "*" || x === message.channel.name ).length > 0 ){
            const userRoles = message.member.roles.map( x => x.name );
            if( command.requiredRoles.filter( x => userRoles.indexOf( x ) === -1 ).length === 0 ){
              command.method.apply( this, [ message.author, message, ...messageBody ] );
            }
            else{
              this._ServerReply( message.author, `Invalid role for command issued '${messageCommand}'`  );
            }
          }
          else{
            this._ServerReply( message.author, `Invalid channel for command issued '${messageCommand}':'${message.channel.name}'`  );
          }
        }
        else{
          this._ServerReply( message.author, `Invalid command issued '${messageCommand}'` );
        }
        
      }
    });
  }

  IsListeningChannel(){

  }

};