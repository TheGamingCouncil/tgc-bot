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
  async Init(){
    this.eventDb = this.db.Collection( "events" );

    this.timers.AddTimerMethod( "DailyEventRun", async () => {
      await this._UpdateAllEventTimers();
      await this.timers.AddDBTimer( "DailyEventRun", moment().hour( 10 ).startOf( "hour" ).add(1, "days" ).valueOf() );
    } );

    this.timers.AddTimerMethod( "HourlyEventRun", async () => {
      await this._SendEventNotifications();
      await this.timers.AddDBTimer( "HourlyEventRun", moment().startOf( "hour" ).add( 1, "hours" ).valueOf() );
    });

    if( !(await this.timers.HasTimerMethod( "DailyEventRun" )) ){
      await this._UpdateAllEventTimers();
      await this.timers.AddDBTimer( "DailyEventRun", moment().hour( 10 ).startOf( "hour" ).add(1, "days" ).valueOf() );
    }

    if( !(await this.timers.HasTimerMethod( "HourlyEventRun" )) ){
      await this._UpdateAllEvents();
      await this._SendEventNotifications();
      await this.timers.AddDBTimer( "HourlyEventRun", moment().startOf( "hour" ).add( 1, "hours" ).valueOf() );
    }

    this.bot.AddWebMethod( "get", "/updateEvents", this._UpdateAllEvents.bind( this ) );
    this.bot.AddWebMethod( "get", "/removeEvent/:tag", this._RemoveEventWeb.bind( this ) );

    this._UpdateAllEvents();
  }

  async _UpdateAllEventTimers(){
    let allEvents = await this.eventDb.Find( {}, { sort : { nextDate : 1 } });

    for( let i = 0; i < allEvents.length; i++ ){
      await this._UpdateEventTimers( allEvents[i] );
    }

    await this._UpdateAllEvents();
  }

  async _UpdateEventTimers( eventDetails ){
    if( eventDetails.nextDate < ( new Date() ).getTime() ){
      if( eventDetails.repeating === "once" ){
        let channel = this.bot.GetChannelByName( "guild-events" );
        if( channel !== null ){
          try{
            let eventPost = await channel.fetchMessage( eventDetails.postId );
            eventPost.delete();
          }
          catch( ex ){
            //Throw away//
          }
          await this.eventDb.Remove( { _id : eventDetails._id } );
          eventDetails._id = null;
        }
      }
      else{
        switch( eventDetails.repeating ){
          case "weekly":
            eventDetails.nextDate = moment( new Date( eventDetails.nextDate ) ).add( 1, "week" ).valueOf();
            break;
          case "biweekly":
            eventDetails.nextDate =moment( new Date( eventDetails.nextDate ) ).add( 2, "week" ).valueOf();
            break;
          case "triweekly":
            eventDetails.nextDate = moment( new Date( eventDetails.nextDate ) ).add( 3, "week" ).valueOf();
            break;
          case "monthly":
            eventDetails.nextDate = moment( new Date( eventDetails.nextDate ) ).add( 1, "month" ).valueOf();
            break;
        }
        for( let role in eventDetails.signups ){
          eventDetails.signups[role].forEach( userId => {
            const user = this.bot.GetUserById( userId );
            const member = this.bot.client.guilds.array()[0].members.filter( x => x.id === userId ).array()[0] || null;
            if( user !== null && member !== null ){
              this.bot.DmUser( user, `You participated in the event "${eventDetails.name}", the event will run again on ${moment( new Date( eventDetails.nextDate ) ).format( "dddd [the] Do" )} at ${(""+eventDetails.hour).padStart( 2, '0' ) + ":" + (""+eventDetails.minute).padStart( 2, '0' )}.\nSignups for the next time this event will take place have started.\nTo signup use The Gaming Council Discord Server`, 8 * 60 * 60 * 1000 );
            }
          });
          eventDetails.signups[role] = [];
        }

        await this.eventDb.Update( { _id : eventDetails._id }, { $set : { signups : eventDetails.signups, nextDate : eventDetails.nextDate }} );
      }
    }
  }

  async _SendEventNotifications(){
    let allEvents = await this.eventDb.Find( {}, { sort : { nextDate : 1 } });
    let todaysEvents = [];
    for( let i = 0; i < allEvents.length; i++ ){
      if( moment().startOf( 'day' ).valueOf() === moment( allEvents[i].nextDate ).startOf( 'day' ).valueOf() ){
        todaysEvents.push( allEvents[i] );
      }
    }

    for( let i = 0; i < todaysEvents.length; i++ ){
      if( moment().subtract( 1, "hours" ).valueOf() <= moment( todaysEvents[i].nextDate ).subtract( 1, "hours" ).valueOf()
        && moment( todaysEvents[i].nextDate ).valueOf() > moment().valueOf() ){
        let signedupUsers = {};
        todaysEvents[i].signups.reserve = todaysEvents[i].signups.reserve || [];
        let roles = [ "anyRole", "tanks", "dps", "heals", "reserve" ];
        for( let r = 0; r < roles.length; r++ ){
          for( let u = 0; u < todaysEvents[i].signups[roles[r]].length; u++ ){
            let userId = todaysEvents[i].signups[roles[r]][u];
            signedupUsers[userId] = roles[r];
          }
        }
        

        for( let userId in signedupUsers ){
          let signedUpText = signedupUsers[userId];
          if( signedUpText === "tanks" ){
            signedUpText = "tank";
          }
          if( signedUpText === "heals" ){
            signedUpText = "healer";
          }
          if( signedUpText === "anyRole" ){
            signedUpText = "any";
          }
          this.bot.DmUser( this.bot.GetUserById( userId ), `A reminder that the event ${todaysEvents[i].name} will start in an hour. You signed up as ${signedUpText} role`, 1000 * 60 * 60 );
        }
      }
      
    }
  }

  async _UpdateAllEvents(){
    let priorEventPosts = await this.bot.SuperFetch( this.bot.GetChannelByName( "guild-events" ), 100 );
    let allEvents = await this.eventDb.Find( {}, { sort : { nextDate : 1 } });

    if( priorEventPosts.length !== allEvents.length ){
      await Promise.all( priorEventPosts.map( async post => await post.delete() ) );
    }

    priorEventPosts = priorEventPosts.reverse();
    let isInOrder = true;
    for( let i = 0; i < allEvents.length; i++ ){
      if( priorEventPosts[i].id !== allEvents[i].postId ){
        isInOrder = false;
        break;
      }
    }

    if( !isInOrder ){
      await Promise.all( priorEventPosts.map( async post => await post.delete() ) );
    }

    for( let i = 0; i < allEvents.length; i++ ){
      await this._UpdateEventData( allEvents[i] );
      if( allEvents[i]._id !== null ){
        await this._UpdateEventPost( allEvents[i] );
      }
    }

    return { success : true };
  }

  _FrequencyFriendly( frequency ){
    return frequencyHashSwitch[frequency];
  }

  async _UpdateEventData( eventDetails ){
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

  async _UpdateEventPost( eventDetails ){
    let channel = this.bot.GetChannelByName( "guild-events" );
    if( channel !== null ){
      let eventPost = null;
      if( eventDetails.postId !== null ){
        try{
          eventPost = await channel.fetchMessage( eventDetails.postId );
        }
        catch( ex ){
          //Throw away//
        }
      }
      if( eventPost === null ){
        eventPost = await this.bot.WriteMessage( "guild-events", `Creating event...` );
        await this.eventDb.Update( { _id : eventDetails._id }, { $set : { postId : eventPost.id } });
      }
      const member = this.bot.client.guilds.array()[0].members.filter( x => x.id === eventDetails.user ).array()[0] || null;
      if( member !== null ){

        let embed = new Discord.RichEmbed()
          .setTitle( `**${eventDetails.name}** - [ *${eventDetails.tag}* ]` )
          .setDescription( eventDetails.text )
          .addField( "Coordinator", `<@${eventDetails.user}>`, true )
          .addField( "Available Slots", ( eventDetails.groupSize.tanks + eventDetails.groupSize.heals + eventDetails.groupSize.dps + eventDetails.groupSize.anyRole ) - ( eventDetails.signups.tanks.length + eventDetails.signups.heals.length + eventDetails.signups.dps.length + eventDetails.signups.anyRole.length ), true )
          .addField( "Minium Level", eventDetails.minLevel , true )
          .setTimestamp( new Date( eventDetails.nextDate ) );

        const types = { "Any Role" : "anyRole", Tanks : "tanks", Healers : "heals", DPS : "dps" };

        const signupHelp = [ this._NormalizeReactionName( "cancel" ), this._NormalizeReactionName( "reserve" ) ];
        Object.keys( types ).forEach( x => {
          if( eventDetails.groupSize[types[x]] > 0 ){
            if( eventDetails.signups[types[x]].length < eventDetails.groupSize[types[x]] ){
              signupHelp.push( this._NormalizeReactionName( types[x] ) );
            }
          }
        });
        
        let buttons = {
          signup_tank_role: this.bot.client.emojis.find(emoji => emoji.name === "signup_tank_role"),
          signup_dps_role: this.bot.client.emojis.find(emoji => emoji.name === "signup_dps_role"),
          signup_healer_role: this.bot.client.emojis.find(emoji => emoji.name === "signup_healer_role"),
          signup_any_role: this.bot.client.emojis.find(emoji => emoji.name === "signup_any_role"),
          signup_reserve_role: this.bot.client.emojis.find(emoji => emoji.name === "signup_reserve_role"),
          cancel_signup: this.bot.client.emojis.find(emoji => emoji.name === "cancel_signup")
        }

        let rebuildReactions = false;
        let existingReactions = eventPost.reactions.map( reaction => reaction._emoji.name );
        if( existingReactions.length !== signupHelp.length ){
          rebuildReactions = true;
        }
        else{
          for( let i = 0; i < existingReactions.length; i++ ){
            if( signupHelp[i] !== existingReactions[i] ){
              rebuildReactions = true;
              break;
            }
          }
        }


        await Promise.all( eventPost.reactions.map( async ( reaction ) => {
          await reaction.fetchUsers();
          await Promise.all( reaction.users.map( async ( user ) => {
            if( rebuildReactions || !user.username.startsWith( "The Gaming Council" ) ){
              await reaction.remove( user.id );
            }
            
          }) );
        }) );

        if( rebuildReactions ){
          for( let i = 0; i < signupHelp.length; i++ ) {
            await eventPost.react( buttons[signupHelp[i]].id );
          }
        }
        
        eventPost.edit( embed );
      }
      else{
        //Remove event as it no longer has an active host...
        this._NotifyCanceledEvent( eventDetails, "The event coordinator has left the guild." );
        await this.eventDb.Remove( { _id : eventDetails._id });
      }
    }
    
    
  }

  _NormalizeReactionName( name ){
    switch( name ){
      case "tanks":
        return "signup_tank_role";
      case "heals":
        return "signup_healer_role";
      case "dps":
        return "signup_dps_role";
      case "anyRole":
        return "signup_any_role";
      case "cancel":
        return "cancel_signup";
      case "reserve":
        return "signup_reserve_role";
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


  async signup( command, tag, role = "any" ){
    let eventDetails = (await this.eventDb.Find( { tag } ))[0] || null;
    role = role.toLowerCase();
    if( eventDetails !== null ){
      if( command.ValidateList( role, "role", [ "tank", "healer", "dps", "any", "reserve" ] ) ){
        if( role === "any" ){
          role = "anyRole";
        }
        if( role === "healer" ){
          role = "heals";
        }
        if( role === "tank" ){
          role = "tanks";
        }
        let signedUpText = role;
        if( signedUpText === "tanks" ){
          signedUpText = "tank";
        }
        if( signedUpText === "heals" ){
          signedUpText = "healer";
        }
        if( signedUpText === "anyRole" ){
          signedUpText = "any";
        }
        eventDetails.signups.reserve = eventDetails.signups.reserve || [];
        if( [ "tanks", "dps", "anyRole", "heals", "reserve" ].filter( x => eventDetails.signups[x].indexOf( command.user.id ) !== -1 ).length === 0 ){
          if( role === "reserve" || eventDetails.groupSize[role] > eventDetails.signups[role].length ){
            eventDetails.signups[role].push( command.user.id );
            await this.eventDb.Update( { _id : eventDetails._id }, { $set : { signups : eventDetails.signups }} );
            command.ServerReply( `You have signed up for event ${eventDetails.name} as ${signedUpText}.` );
            this._UpdateEventPost( eventDetails );
          }
          else{
            command.ServerReply( `The event ${eventDetails.name} has all ${signedUpText} slots full.` );
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
      const signedUpRole = [ "tanks", "dps", "anyRole", "heals", "reserve" ].filter( x => eventDetails.signups[x].indexOf( command.user.id ) !== -1 )[0] || null;
      if( signedUpRole !== null ){
        eventDetails.signups[signedUpRole].splice( eventDetails.signups[signedUpRole].indexOf( command.user.id ), 1 );
        await this.eventDb.Update( { _id : eventDetails._id }, { $set : { signups : eventDetails.signups }} );
        let signedUpText = signedUpRole;
        if( signedUpText === "tanks" ){
          signedUpText = "tank";
        }
        if( signedUpText === "heals" ){
          signedUpText = "healer";
        }
        if( signedUpText === "anyRole" ){
          signedUpText = "any";
        }
        command.ServerReply( `Your signup for the event ${eventDetails.name} as ${signedUpText} was canceled` );
        this._UpdateEventPost( eventDetails );
      }
      else{
        command.ServerReply( `You attempted to cancel a signup for the event ${eventDetails.name}, but you were not signed up.` );
      }
    }
    else{
      command.ServerReply( `Event not found ${tag}.` );
    }
  }

  async _RemoveEventWeb( req ){
    let eventDetails = (await this.eventDb.Find( { tag : req.params.tag } ))[0];
    let channel = this.bot.GetChannelByName( "guild-events" );
    if( channel !== null ){
      let eventPost = await channel.fetchMessage( eventDetails.postId );
      eventPost.delete();
      this._NotifyCanceledEvent( eventDetails, req.query.reason );
      await this.eventDb.Remove( { _id : eventDetails._id } );
    }

    return { success : true };
  }

  async removeEvent( command, tag, reason = "Not enough intrest" ){
    if( command.AssertRoles( [ "Event Coordinator" ] ) ){
      let eventDetails = (await this.eventDb.Find( { tag } ))[0] || null;
      if( eventDetails !== null ){
        let channel = this.bot.GetChannelByName( "guild-events" );
        if( channel !== null ){
          let eventPost = await channel.fetchMessage( eventDetails.postId );
          eventPost.delete();
          this._NotifyCanceledEvent( eventDetails, reason );
          await this.eventDb.Remove( { _id : eventDetails._id } );
        }
      }
      else{
        command.ServerReply( `Event not found ${tag}.` );
      }
    }
    
  }

};