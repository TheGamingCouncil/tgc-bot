//DO NOT COMMIT CODE HERE
const config = require( "./config" );
const quotes = require( "./things-to-say" );
const mongodb = require('mongodb').MongoClient;
const MongoId = require('mongodb').ObjectID;
const moment = require( "moment" );

const Discord = require("discord.js");
const client = new Discord.Client();

client.on("ready", async () => {
  // This event will run if the bot starts, and logs in, successfully.
  console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`); 
  // Example of changing the bot's playing game to something useful. `client.user` is what the
  // docs refer to as the "ClientUser".
  client.user.setActivity( `Waiting for commands` );


  const tgcBot = new TGCBot( client );
  await tgcBot.ConnectMongo();

  tgcBot.UpdateAllEvents();

  //const user = tgcBot.GetUserByName( "navstev0" );
  //console.log( user );

  //tgcBot.WriteMessage( "bot-trashbox", "at test <@183450121642573834>" );
  //let message = await tgcBot.WriteMessage( "social-lobby", `Beep beep` );
  //tgc createEvent "My Event" "my super special event" monday 11:30 0 1 1 2 false
});



client.login( config.token );

class TGCBot{
  constructor( client ){
    this.client = client;
    this.events = {};
    this.welcomeList = [];
    this._SetupEvents();
    
  }

  async ConnectMongo(){
    this.db = await this._ConnectToDatabaseMongo();
  }

  _ConnectToDatabaseMongo() {
    return new Promise( ( resolve, reject ) => {
      let db_path = 'mongodb://127.0.0.1:27017';
			if(config["db"]){
				db_path = config["db"];
			}
      mongodb.connect( db_path, { useNewUrlParser: true }, ( err, client ) => {
        if (err) {
          console.log("Mongo Database couldn't connect with error.");
          console.log(err);
          reject( err );
        }
        else {
          console.log("Mongo Database connected.");
          resolve( client.db( 'tcg' ) );
        }

      } );
    } );
  }

  SaySnappyQuote(){
    let openers = Object.keys( quotes.statements );
    let openerIndex = Math.floor(Math.random() * openers.length );
    let opener = openers[openerIndex];
    let swiches = Object.keys( quotes.statements[opener] );
    let selectedSwitch = swiches[Math.floor(Math.random() * swiches.length )];
    let enders = quotes.statements[opener][selectedSwitch];
    let selectedEnder = enders[Math.floor(Math.random() * enders.length )];
    let fullQuote = `${opener} ${selectedSwitch} ${selectedEnder}`;

    let matches = fullQuote.match( /\{([A-z]+)\}/gi );
    if( matches !== null ){
      matches.forEach( x => {
        let matchName = x.substr( 1, x.length - 2 );
        fullQuote = fullQuote.replace( x, quotes[matchName][Math.floor(Math.random() * quotes[matchName].length )] )
      } );
    }

    return fullQuote;
    
  }

  ExtractArguments( args ){
    const quoteMatches = args.match( /\"[A-z\d_\- ]+\"/gi ) || [];
    const squoteMatches = args.match( /\'[A-z\d_\- ]+\'/gi ) || [];
    quoteMatches.forEach( ( x, index ) => args = args.replace( x, "%q" + index ) );
    squoteMatches.forEach( ( x, index ) => args = args.replace( x, "%s" + index ) );
    const realArgs = args.split( " " );
    return realArgs.map( x => {
      if( x.startsWith( "%q" ) ){
        const match = quoteMatches[parseInt( x.substr( 2 ) )];
        return match.substr( 1, match.length - 2 );
      }
      else if( x.startsWith( "%s" ) ){
        const match = squoteMatches[parseInt( x.substr( 2 ) )];
        return match.substr( 1, match.length - 2 );
      }
      else{
        return x;
      }
    });
  }

  _ValidateList( user, messageCommand, field, fieldName, list ){
    if( list.indexOf( field ) === -1 ){
      this._ServerReply( user, `Invalid command argument issued '${messageCommand}':${fieldName}[${field}] supported - ${list.join( ',' )}` );
      return false;
    }

    return true;
  }

  _ValidateValue( user, messageCommand, field, fieldName, validation ){
    if( field.match( validation ) === null ){
      this._ServerReply( user, `Invalid command argument issued '${messageCommand}':${fieldName}[${field}] supported - ${validation}` );
      return false;
    }
    
    return true;
  }

  _DayToNumber( day ){
    return [ "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday" ].indexOf( day );
  }


  _SetupEvents(){
    this._OnNewMember();
    this._OnByeMember();

    this._ListenForEvent( [ "*" ], [], "help", ( user, message ) => {
      this._ServerReply( user, `At this point my help is weak as the only supported command is help. So I really can't help you.`  );
    } );

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
        let eventPost = await this.DbInsert( "events", eventData );
        this._UpdateEventPost( eventPost );
      }
    } );

    this._ListenForEvent( [ "*" ], [ "Event Coordinator" ], "updateEvent", ( user, message, id, field, value ) => {
      this._ServerReply( user, `Event updates are still a work in progress.`  );
    } );

    this._ListenForEvent( [ "*" ], [], "signup", async ( user, message, id, role = "any" ) => {
      let eventDetails = (await this.DbFind( "events", { _id : new MongoId( id ) } ))[0] || null;
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
              await this.DbUpdate( "events", { _id : eventDetails._id }, { $set : { signups : eventDetails.signups }} );
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
      let eventDetails = (await this.DbFind( "events", { _id : new MongoId( id ) } ))[0] || null;
      if( eventDetails !== null ){
        const signedUpRole = [ "tanks", "dps", "anyRole", "heals" ].filter( x => eventDetails.signups[x].indexOf( user.id ) !== -1 )[0] || null;
        if( signedUpRole !== null ){
          eventDetails.signups[signedUpRole].splice( eventDetails.signups[signedUpRole].indexOf( user.id ), 1 );
          await this.DbUpdate( "events", { _id : eventDetails._id }, { $set : { signups : eventDetails.signups }} );
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

    this._ListenForEvent( [ "*" ], [ "Event Coordinator" ], "removeEvent", async ( user, message, id ) => {
      let eventDetails = (await this.DbFind( "events", { _id : new MongoId( id ) } ))[0] || null;
      if( eventDetails !== null ){
        if( eventDetails.user === user.id ){
          let channel = this.GetChannelsByName( "guild-events" )[0] || null;
          if( channel !== null ){
            let eventPost = await channel.fetchMessage( eventDetails.postId );
            eventPost.delete();
            await this.DbRemove( "events", { _id : eventDetails._id } );
          }
        }
        else{
          this._ServerReply( user, `Not authorized to remove event, if you are an admin remove the event from the guild-events channel and it will be removed from the database.` );
        }
      }
      else{
        this._ServerReply( user, `Event not found ${id}.` );
      }
    } );

    //tgc removeEvent "My Event"

    //this._ListenForEvent( [ "*" ], [], )

    this._SetupMessageListeners();
  }

  async _UpdateEventPost( eventDetails ){
    let channel = this.GetChannelsByName( "guild-events" )[0] || null;
    if( channel !== null ){
      let eventPost = await channel.fetchMessage( eventDetails.postId );
      if( eventPost !== null ){
        const member = this.client.guilds.array()[0].members.filter( x => x.id === eventDetails.user ).array()[0] || null;
        if( member !== null ){
          let days = [ "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" ];
          let date = null;
          if( moment().isoWeekday() <= eventDetails.day ){
            date = moment().isoWeekday( eventDetails.day );
          }
          else{
            date = moment().add(1, 'weeks').isoWeekday( eventDetails.day );
          }
          date.hours( eventDetails.hour );
          date.minutes( eventDetails.minute );

          let embed = new Discord.RichEmbed()
            .setTitle( `**${eventDetails.name}** - ${eventDetails._id}` )
            .setDescription( eventDetails.text )
            .addField( "Coordinator", `<@${eventDetails.user}>`, true )
            .addField( "Date/Time", days[eventDetails.day] + " at " + eventDetails.hour + ":" + eventDetails.minute, true )
            .addField( "Available Slots", ( eventDetails.groupSize.tanks + eventDetails.groupSize.heals + eventDetails.groupSize.dps + eventDetails.groupSize.anyRole ) - ( eventDetails.signups.tanks.length + eventDetails.signups.heals.length + eventDetails.signups.dps.length + eventDetails.signups.anyRole.length ), true )
            .addField( "Minimum Level", eventDetails.minLevel, true )
            .addField( "Required DPS", "0", true )
            .addField( "Game", "ESO", true )
            .setTimestamp( date );

          const types = { Tanks : "tanks", Healers : "heals", DPS : "dps", "Any Role" : "anyRole" };

          Object.keys( types ).forEach( x => {
            if( eventDetails.groupSize[types[x]] > 0 ){
              let signups = [];
            
              for( let i = 0; i < eventDetails.groupSize[types[x]]; i++ ){
                let userDetail = "";
                if( eventDetails.signups[types[x]][i] ){
                  const memberId = eventDetails.signups[types[x]][i];
                  const member = this.client.guilds.array()[0].members.filter( x => x.id === memberId ).array()[0] || null;
                  if( member !== null ){
                    userDetail = member.nickname || member.user.username;
                  }
                  else{
                    //This user signed up and then left the guild, so there spot will need to be removed and cleaned up. @TODO
                  }
                }
                signups.push( ( i + 1 ) + ") " + userDetail );
              }
              embed.addField( x + " Signups " + eventDetails.signups[types[x]].length + " of " + eventDetails.groupSize[types[x]], "```" + signups.join( "\n" ) + "```" )
            }
          });
          
            
            /*.addField( "Signups Heals", "```" + signups.join( "\n" ) + "```" )
            .addField( "Signups DPS", "```" + signups.join( "\n" ) + "```" )
            .addField( "Signups Any Role", "```" + signups.join( "\n" ) + "```" )*/
            //.addField( "" )
            
          //eventPost.edit( `**${eventDetails.name}** | on ${days[eventDetails.day]} at , hosted by <@${eventDetails.user}> \n\`\`\`${eventDetails.text}\n\n\`\`\`` );
          eventPost.edit( embed );
        }
        else{
          //Remove event as it no longer has an active host...
          await this.DbRemove( { _id : eventDetails._id });
        }
      }
      else{
        //Remove event as it is no longer an active event...
        await this.DbRemove( { _id : eventDetails._id });
      }
    }
    
    
  }

  async UpdateAllEvents(){
    let allEvents = await this.DbFind( "events" );
    for( let i = 0; i < allEvents.length; i++ ){
      this._UpdateEventPost( allEvents[i] );
    }
  }

  DbFind( collection, selector = {}, options = {} ){
    return new Promise( ( resolve, reject ) => {
      this.db.collection( collection ).find( selector, options ).toArray( ( err, results ) => {
        if( !err ) {
          resolve( results.map( (result) => result ) );
        }
        else {
          reject( err );
        }
      } );
    });
  }

  DbUpdate( collection, selector, document, options = {} ) {
    return new Promise( ( resolve, reject ) => {
      this.db.collection( collection ).updateOne( selector, document, options, ( err, result ) => {
        if( !err ) {
          resolve( result );
        }
        else {
          reject(err);
        }
      });
    } );
  }

  DbRemove( collection, selector = {} ){
    return new Promise( ( resolve, reject ) => {
      this.db.collection( collection ).deleteOne( selector, ( err, numberOfRemovedDocs ) => {
        if( !err ){
          resolve( numberOfRemovedDocs );
        }
        else{
          reject( err );
        }
      } );
    });
  }

  DbInsert( collection, document, options = {} ) {
    return new Promise( ( resolve, reject ) => {
      this.db.collection( collection ).insertOne( document, options, ( err, result ) => {
        if( !err ) {
          resolve( result.ops[0] );
        }
        else {
          reject( err );
        }
      });
    });
  }

  _OnNewMember(){
    this.client.on( "guildMemberAdd", member => {
      const newMemberSnapy = this.SaySnappyQuote();
      if( this.welcomeList.filter( x => x === member.user.id ).length === 0 ){
        this.welcomeList.push( member.user.id );
        this.WriteMessage( "social-lobby", `Welcome <@${member.user.id}>! ${newMemberSnapy}` );
        setTimeout( () => this.welcomeList.splice( this.welcomeList.indexOf( member.user.id ), 1 ), 30000 );
      }
    } );
  }

  _OnByeMember(){
    this.client.on( "guildMemberRemove", member => {
      const aka = `AKA(${member.nickname || member.username})`;
      this.WriteMessage( "social-lobby", `A member has left our ranks! Let us all sing a song and remember the good times we had with ${member.user.tag} ${aka}!` );
    } );
  }

  GetChannelsByName( name ){
    return this.client.channels.filter( x => x.name === name ).array();
  }

  GetUserByName( name ){
    return this.client.users.filter( x => x.username === name ).array();
  }

  async WriteMessage( channel, message ){
    if( typeof( channel ) === "string" ){
      channel = this.GetChannelsByName( channel );
    }

    if( channel !== null && channel.length ){
      return await channel[0].send( message );
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

  async _ServerReply( user, message, decayTimer = 30000 ){
    let reply = await user.send( "```" + message + ".```\n\n```This message will self destruct in " + ( decayTimer / 1000 ) + " seconds.```" );
    setTimeout( () => reply.delete(), decayTimer );
  }

  IsListeningChannel(){

  }

}