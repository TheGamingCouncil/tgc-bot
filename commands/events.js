const Command = require( "../abstract/command" );
const MongoId = require('mongodb').ObjectID;
const moment = require( "moment" );
const Discord = require("discord.js");

const frequencyHashSwitch = {
  "once": "Just Once",
  "weekly" : "Every Week",
  "biweekly" : "Every Other Week",
  "triweekly" : "Every Three Weeks",
  "monthly" : "Every Month"
};

module.exports = class Events extends Command{
  Init(){
    this.eventDb = this.db.Collection( "events" );
    this.timers.AddRunAtTimer( "eventUpdate", 10, 0, ( ) => {
      this._UpdateAllEvents();
    });
  }

  async _UpdateAllEvents(){
    let allEvents = await this.eventDb.Find();
    for( let i = 0; i < allEvents.length; i++ ){
      await this._UpdateEventData( allEvents[i] );
      if( allEvents[i]._id !== null ){
        await this._UpdateEventPost( allEvents[i] );
      }
    }
  }

  _FrequencyFriendly( frequency ){
    return frequencyHashSwitch[frequency];
  }

  async _UpdateEventData( eventDetails ){
    if( eventDetails.nextDate + ( 1000 * 60 * 60 * 5 ) < ( new Date() ).getTime() ){
      if( eventDetails.repeating === "once" ){
        let channel = this.bot.GetChannelByName( "guild-events" );
        if( channel !== null ){
          let eventPost = await channel.fetchMessage( eventDetails.postId );
          eventPost.delete();
          await this.eventDb.Remove( { _id : eventDetails._id } );
          eventDetails._id = null;
        }
      }
      else{
        switch( eventDetails.repeating ){
          case "weekly":
            eventDetails.nextDate = ( new Date( moment( new Date( eventDetails.nextDate ) ).add( 1, "week" ) ) ).getTime();
            break;
          case "biweekly":
            eventDetails.nextDate =( new Date( moment( new Date( eventDetails.nextDate ) ).add( 2, "week" ) ) ).getTime();
            break;
          case "triweekly":
            eventDetails.nextDate = ( new Date( moment( new Date( eventDetails.nextDate ) ).add( 3, "week" ) ) ).getTime();
            break;
          case "monthly":
            eventDetails.nextDate = ( new Date( moment( new Date( eventDetails.nextDate ) ).add( 1, "month" ) ) ).getTime();
            break;
        }
        for( let role in eventDetails.signups ){
          eventDetails.signups[role].forEach( userId => {
            const user = this.bot.GetUserById( userId );
            const member = this.bot.client.guilds.array()[0].members.filter( x => x.id === userId ).array()[0] || null;
            if( user !== null && member !== null ){
              this.bot.DmUser( user, `You participated in the event "${eventDetails.name}", the event will run again on ${moment( new Date( eventDetails.nextDate ) ).format( "dddd [the] Do" )} at ${(""+eventDetails.hour).padStart( 2, '0' ) + ":" + (""+eventDetails.minute).padStart( 2, '0' )}.\nSignups for the next time this event will take place have started.\nTo signup use The Gaming Council Discord Server`, 60 * 60 * 1000 );
            }
          });
          eventDetails.signups[role] = [];
        }

        await this.eventDb.Update( { _id : eventDetails._id }, { $set : { signups : eventDetails.signups, nextDate : eventDetails.nextDate }} );
      }
    }
    else{
      //User signup check
      for( let role in eventDetails.signups ){
        let usersNoMore = [];
        eventDetails.signups[role].forEach( userId => {
          const member = this.bot.client.guilds.array()[0].members.filter( x => x.id === userId ).array()[0] || null;
          if( member === null ){
            usersNoMore.push( userId );
          }
        } );

        usersNoMore.forEach( userId => {
          eventDetails.signups[role].splice( eventDetails.signups[role].indexOf( userId ), 1 );
        });
      }

      await this.eventDb.Update( { _id : eventDetails._id }, { $set : { signups : eventDetails.signups }} );
    }
  }

  async _UpdateEventPost( eventDetails ){
    let channel = this.bot.GetChannelByName( "guild-events" );
    if( channel !== null ){
      let eventPost = null;
      try{
        eventPost = await channel.fetchMessage( eventDetails.postId );
      }
      catch( ex ){
        //Throw away//
      }
      if( eventPost !== null ){
        const member = this.bot.client.guilds.array()[0].members.filter( x => x.id === eventDetails.user ).array()[0] || null;
        if( member !== null ){

          let embed = new Discord.RichEmbed()
            .setTitle( `**${eventDetails.name}** - [ *${eventDetails.tag}* ]` )
            .setDescription( eventDetails.text )
            .addField( "Coordinator", `<@${eventDetails.user}>`, true )
            .addField( "Date/Time", moment( new Date( eventDetails.nextDate ) ).format( "dddd [the] Do" ) + " at " + (""+eventDetails.hour).padStart( 2, '0' ) + ":" + (""+eventDetails.minute).padStart( 2, '0' ) , true )
            .addField( "Frequency", this._FrequencyFriendly( eventDetails.repeating ), true )
            .addField( "Available Slots", ( eventDetails.groupSize.tanks + eventDetails.groupSize.heals + eventDetails.groupSize.dps + eventDetails.groupSize.anyRole ) - ( eventDetails.signups.tanks.length + eventDetails.signups.heals.length + eventDetails.signups.dps.length + eventDetails.signups.anyRole.length ), true )
            .addField( "Minimum Level", eventDetails.minLevel, true )
            .addField( "Game", eventDetails.game, true )
            .setTimestamp( new Date( eventDetails.nextDate ) );

          const types = { Tanks : "tanks", Healers : "heals", DPS : "dps", "Any Role" : "anyRole" };

          Object.keys( types ).forEach( x => {
            if( eventDetails.groupSize[types[x]] > 0 ){
              let signups = [];
            
              for( let i = 0; i < eventDetails.groupSize[types[x]]; i++ ){
                let userDetail = "";
                if( eventDetails.signups[types[x]][i] ){
                  const memberId = eventDetails.signups[types[x]][i];
                  const member = this.bot.client.guilds.array()[0].members.filter( x => x.id === memberId ).array()[0] || null;
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
          
          eventPost.edit( embed );
        }
        else{
          //Remove event as it no longer has an active host...
          await this.eventDb.Remove( { _id : eventDetails._id });
        }
      }
      else{
        //Remove event as it is no longer an active event...
        this._NotifyCanceledEvent( eventDetails, "Removed by an Admin" );
        await this.eventDb.Remove( { _id : eventDetails._id });
      }
    }
    
    
  }

  _NotifyCanceledEvent( eventDetails, reason ){
    for( let role in eventDetails.signups ){
      eventDetails.signups[role].forEach( userId => {
        const user = this.bot.GetUserById( userId );
        const member = this.bot.client.guilds.array()[0].members.filter( x => x.id === userId ).array()[0] || null;
        if( user !== null && member !== null ){
          this.bot.DmUser( user, `You signedup for the event "${eventDetails.name}", the was scheduled to run on ${moment( new Date( eventDetails.nextDate ) ).format( "dddd [the] Do" )} at ${(""+eventDetails.hour).padStart( 2, '0' ) + ":" + (""+eventDetails.minute).padStart( 2, '0' )}.\nHowever this event has been canceled with the reason '${reason}'`, 60 * 60 * 1000 );
        }
      });
    }
  }

  //Test Event Post
  //tgc createEvent "My Event" "Very Special Event" 12/10/2018 13:30 *:12 weekly cp160
  async createEvent( command, name, text, startingDate, time, roles = "*:1,t:1,h:1,d:1", repeating = "once", minLevel = "0", game = "ESO" ){
    repeating = repeating.toLowerCase();
    if( command.AssertRoles( [ "Event Coordinator" ] ) 
    && command.ValidateValue( startingDate, "startingDate", /^\d{1,2}\/\d{1,2}\/\d{4}$/, "##/##/####" )
    && command.ValidateList( repeating, "repeating", Object.keys( frequencyHashSwitch ) )
    && command.ValidateValue( time, "time", /^\d\d\:\d\d$/i, "##:##" )
    && command.ValidateValue( roles, "roles", /^((\*|t|h|d):\d+,\s*|)*((\*|t|h|d):\d+)$/, "*:#,t:#,h:#,d:#" ) ){
      let tanks = 0;
      let heals = 0;
      let dps = 0;
      let anyRole = 0;
      roles.split( "," ).forEach( x => {
        const role = x.trim().split(":")[0];
        const size = x.trim().split(":")[1];
        switch( role ){
          case "*":
            anyRole = size;
            break;
          case "t":
            tanks = size;
            break;
          case "h":
            heals = size;
            break;
          case "d":
            dps = size;
            break;
        }
      });

      const hour = parseInt( time.split( ":" )[0] );
      const minute = parseInt( time.split( ":" )[1] );
      const nextDay = moment( new Date( startingDate ) ).hour( hour ).minute( minute ).second( 0 ).millisecond( 0 );

      command.ServerReply( `Event '${name}' created, check guild-events.`  );
      const post = await this.bot.WriteMessage( "guild-events", `Creating event...` );
      const eventData = {
        nextDate : ( new Date( nextDay ) ).getTime(),
        user : command.user.id,
        tag : name.replace( / /g, "" ).toLowerCase(),
        postId : post.id,
        name : name,
        text : text,
        groupSize : {
          tanks : parseInt( tanks ),
          heals : parseInt( heals ),
          dps : parseInt( dps ),
          anyRole : parseInt( anyRole )
        },
        hour,
        minute,
        minLevel : minLevel,
        signups : {
          tanks : [],
          heals : [],
          dps : [],
          anyRole : []
        },
        game,
        repeating
      };
      let eventPost = await this.eventDb.Insert( eventData );
      this._UpdateEventPost( eventPost );
    }
  }

  async updateEvent( command, tag ){
    
    if( command.AssertRoles( [ "Event Coordinator" ] ) ){
      command.ServerReply( `Event updates are still a work in progress.`  );
    }
  }

  async updateEventDescription( command, tag, newDescription ){
    if( command.AssertRoles( [ "Event Coordinator" ] ) ){
      let eventDetails = (await this.eventDb.Find( { tag } ))[0] || null;
      if( eventDetails !== null ){
        await this.eventDb.Update( { _id : eventDetails._id }, { $set : { text : newDescription }} );
        command.ServerReply( `Event description was updated for ${eventDetails.name}.` );
        this._UpdateEventPost( eventDetails );
      }
      else{
        command.ServerReply( `Event not found ${id}.` );
      }
    }
  }

  async signup( command, tag, role = "any" ){
    let eventDetails = (await this.eventDb.Find( { tag } ))[0] || null;
    role = role.toLowerCase();
    if( eventDetails !== null ){
      if( command.ValidateList( role, "role", [ "tank", "healer", "dps", "any" ] ) ){
        if( role === "any" ){
          role = "anyRole";
        }
        if( role === "healer" ){
          role = "heals";
        }
        if( [ "tanks", "dps", "anyRole", "heals" ].filter( x => eventDetails.signups[x].indexOf( command.user.id ) !== -1 ).length === 0 ){
          if( eventDetails.groupSize[role] > eventDetails.signups[role].length ){
            eventDetails.signups[role].push( command.user.id );
            await this.eventDb.Update( { _id : eventDetails._id }, { $set : { signups : eventDetails.signups }} );
            command.ServerReply( `You have signed up for event ${eventDetails.name} as ${role}.` );
            this._UpdateEventPost( eventDetails );
          }
          else{
            command.ServerReply( `The event ${eventDetails.name} has all ${role} slots full.` );
          }
        }
        else{
          command.ServerReply( `You are already signup for the event ${eventDetails.name}, to change your roll you must resignup after removing your signup. With tgc cancelSignup \"Event Name\"` );
        }
      }
    }
    else{
      command.ServerReply( `Event not found ${tag}.` );
    }
  }

  async cancelSignup( command, tag ){
    let eventDetails = (await this.eventDb.Find( { tag } ))[0] || null;
    if( eventDetails !== null ){
      const signedUpRole = [ "tanks", "dps", "anyRole", "heals" ].filter( x => eventDetails.signups[x].indexOf( command.user.id ) !== -1 )[0] || null;
      if( signedUpRole !== null ){
        eventDetails.signups[signedUpRole].splice( eventDetails.signups[signedUpRole].indexOf( command.user.id ), 1 );
        await this.eventDb.Update( { _id : eventDetails._id }, { $set : { signups : eventDetails.signups }} );
        command.ServerReply( `Your signup for the event ${eventDetails.name} as ${signedUpRole} was canceled` );
        this._UpdateEventPost( eventDetails );
      }
      else{
        command.ServerReply( `You attempted to cancel a signup for the event ${eventDetails.name}, but you were not signed up.` );
      }
    }
    else{
      command.ServerReply( `Event not found ${id}.` );
    }
  }

  async removeEvent( command, tag, reason = "Not enough intrest" ){
    if( command.AssertRoles( [ "Event Coordinator" ] ) ){
      let eventDetails = (await this.eventDb.Find( { tag } ))[0] || null;
      if( eventDetails !== null ){
        if( eventDetails.user === command.user.id ){
          let channel = this.bot.GetChannelByName( "guild-events" );
          if( channel !== null ){
            let eventPost = await channel.fetchMessage( eventDetails.postId );
            eventPost.delete();
            this._NotifyCanceledEvent( eventDetails, reason );
            await this.eventDb.Remove( { _id : eventDetails._id } );
          }
        }
        else{
          command.ServerReply( `Not authorized to remove event, if you are an admin remove the event from the guild-events channel and it will be removed from the database.` );
        }
      }
      else{
        command.ServerReply( `Event not found ${tag}.` );
      }
    }
    
  }

};