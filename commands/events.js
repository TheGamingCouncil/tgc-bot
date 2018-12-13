const Command = require( "../abstract/command" );
const MongoId = require('mongodb').ObjectID;
const moment = require( "moment" );
const Discord = require("discord.js");

module.exports = class Events extends Command{
  Init(){
    this.eventDb = this.db.Collection( "events" );
    this._UpdateAllEvents();
  }

  async _UpdateAllEvents(){
    let allEvents = await this.eventDb.Find();
    for( let i = 0; i < allEvents.length; i++ ){
      this._UpdateEventPost( allEvents[i] );
    }
  }

  _DayToNumber( day ){
    return [ "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday" ].indexOf( day );
  }

  async _UpdateEventPost( eventDetails ){
    let channel = this.bot.GetChannelByName( "guild-events" );
    if( channel !== null ){
      let eventPost = await channel.fetchMessage( eventDetails.postId );
      if( eventPost !== null ){
        const member = this.bot.client.guilds.array()[0].members.filter( x => x.id === eventDetails.user ).array()[0] || null;
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
            .addField( "Date/Time", days[eventDetails.day] + " at " + (""+eventDetails.hour).padStart( 2, '0' ) + ":" + (""+eventDetails.minute).padStart( 2, '0' ), true )
            .addField( "Available Slots", ( eventDetails.groupSize.tanks + eventDetails.groupSize.heals + eventDetails.groupSize.dps + eventDetails.groupSize.anyRole ) - ( eventDetails.signups.tanks.length + eventDetails.signups.heals.length + eventDetails.signups.dps.length + eventDetails.signups.anyRole.length ), true )
            .addField( "Minimum Level", eventDetails.minLevel, true )
            .addField( "Required DPS", eventDetails.minDPS, true )
            .addField( "Game", eventDetails.game, true )
            .setTimestamp( date );

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
          
            
            /*.addField( "Signups Heals", "```" + signups.join( "\n" ) + "```" )
            .addField( "Signups DPS", "```" + signups.join( "\n" ) + "```" )
            .addField( "Signups Any Role", "```" + signups.join( "\n" ) + "```" )*/
            //.addField( "" )
            
          //eventPost.edit( `**${eventDetails.name}** | on ${days[eventDetails.day]} at , hosted by <@${eventDetails.user}> \n\`\`\`${eventDetails.text}\n\n\`\`\`` );
          eventPost.edit( embed );
        }
        else{
          //Remove event as it no longer has an active host...
          await this.eventDb.Remove( { _id : eventDetails._id });
        }
      }
      else{
        //Remove event as it is no longer an active event...
        await this.eventDb.Remove( { _id : eventDetails._id });
      }
    }
    
    
  }

  async removeEvent( command, id ){
    if( command.AssertRoles( [ "Event Coordinator" ] ) ){
      let eventDetails = (await this.eventDb.Find( { _id : new MongoId( id ) } ))[0] || null;
      if( eventDetails !== null ){
        if( eventDetails.user === user.id ){
          let channel = this.bot.GetChannelByName( "guild-events" );
          if( channel !== null ){
            let eventPost = await channel.fetchMessage( eventDetails.postId );
            eventPost.delete();
            await this.eventDb.Remove( { _id : eventDetails._id } );
          }
        }
        else{
          command.ServerReply( `Not authorized to remove event, if you are an admin remove the event from the guild-events channel and it will be removed from the database.` );
        }
      }
      else{
        command.ServerReply( `Event not found ${id}.` );
      }
    }
    
  }

};