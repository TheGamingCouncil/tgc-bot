const crypto = require( "crypto" );

const Command = require( "../abstract/command" );
const helpByRole = {
  "*" : {
    "Help" : {
      command : "help",
      description : "You got this message because you used the help command.",
      example : "tgc help",
      system : "Help"
    },
    "Web Token" : {
      command : "webToken",
      description : "Used to create a temporary token to sign into tgcguild.com.",
      example : "tgc webToken",
      system : "Users"
    },
    "Explain Acronym" : {
      command : "wtfis [acronym]",
      description : "This will tell you what a perticular commonly used acronym really means.",
      params : {
        acronym : "The acronym you want to know the meaning of."
      },
      example : "tgc wtfis vCR",
      system : "Library"
    },
    "Signup for Event" : {
      command : "signup [tag] (role)",
      description : "This will allow you to signup for an event based on the event tag.",
      params : {
        tag : "The event tag is listed on the event after the - in the name",
        role : "By default this will attempt to signup under the any role. Values accepted for the role are any, dps, tank, healer."
      },
      example : "tgc signup testEvent dps",
      system : "Event"
    },
    "Cancel Event Signup" : {
      command : "cancelSignup [tag]",
      description : "This will cancel your signup for a perticular event based on the event tag. The event tag is listed on the event after the - in the name.",
      params : {
        tag : "The event tag is listed on the event after the - in the name"
      },
      example : "tgc cancelSignup testEvent",
      system : "Event"
    }
  },
  "Event Coordinator" : {
    "Update Event Description" : {
      command : "updateEventDescription [tag] [description]",
      description : "This will update an event with the new description, based on the event tag.",
      params : {
        tag : "The event tag is listed on the event after the - in the name"
      },
      example : "tgc updateEventDescription testEvent \"This is a cooler event, everyone should sign-up for.\"",
      system : "Event"
    },
    "Create an Event" : {
      command : "createEvent [name] [description] [date] [time] (roles) (repeating) (minimum level) (game)",
      description : "Creates an event for others to signup for, the event will be placed into the guild-events channel.",
      params : {
        name : "The name of the event. The tag will be generated based off this name, and must be unique.",
        text : "The description of the event, this text will be placed in the event post body.",
        date : "The first date the event will run, or only date with it is only set to run once. Date must be formatted like so 12/28/2018.",
        time : "The time the event will run, this is based on EST and uses military time where 13:00 is 1:00PM.",
        roles : "By default this will be *:1,t:1,h:1,d:1 or 1 of each type of role. It is formatted with type:number and seperated with a ',' between types.",
        repeating : "By default this will be once, other possiable values are: weekly, biweekly, triweekly, monthly.",
        "minimum level" : "By default this will be 0, and this is just text to help describe the minimum level requirements to participate in said event.",
        game : "The game used for the event, by default this is eso."
      },
      example : "tgc createEvent testEvent \"This is a cool event everyone should signup for.\" 12/28/2018 18:15 *:3,h:1 once 0 ESO",
      system : "Event"
    },
    "Remove an Event" : {
      command : "removeEvent [tag] (reason)",
      description : "Removes the event and notifies all the signed up users that the event was canceled because of reasons.",
      params : {
        tag : "The event tag is listed on the event after the - in the name",
        reason : "The reason the event was canceled, this will be 'Not enough intrest' by default"
      },
      example : "tgc removeEvent testEvent \"This event was not as cool as I thought it would be.\"",
      system : "Event"
    }
  },
  "Librarian" : {
    "Add/Update Acronym in Library" : {
      command : "updateLibrary [acronym] [description] [hasVetNormalSwitch]",
      description : "Updates an acronym in the library of acronyms that can be decribed with the ? command. If once does not exist it is created.",
      params : {
        acronym : "The acronym you want to describe the meaning of. This is not case sensitive.",
        description : "The description used to describe the acronym to users who ask to know what it is.",
        hasVetNormalSwitch : "Tells if the acronym starts with a n and a v for vetern and normal modes of play. Acceptable values are true and false."
      },
      example : "tgc updateLibrary vCR \"Veteran Cloud Rest\" true",
      system : "Library"
    },
    "Remove Acronym from Library" : {
      command : "removeLibrary [acronym]",
      description : "Removes an acronym from the library of acronyms.",
      params : {
        acronym : "The acronym you want to remove the meaning of. This is not case sensitive."
      },
      example : "tgc removeLibrary vCR",
      system : "Library"
    }
  }
};

module.exports = class Help extends Command{
  async Init(){
    this.guildUsersDb = this.db.Collection( "guildUsers" );
  }

  async help( command ){
    
    let userHelp = {};

    for( let role in helpByRole ){
      if( ( role !== "*" && command.AssertRoles( [ role ], false ) ) || role === "*" ){
        for( let helpCommand in helpByRole[role] ){
          const system = helpByRole[role][helpCommand].system;
          if( userHelp[system] === undefined ){
            userHelp[system] = {};
          }

          userHelp[system][helpCommand] = helpByRole[role][helpCommand];
        }
      }
    }

    let userHelpOutputArray = [
      "**Help System**\nHow to read commands:\n[] - denotes a required parameters.\n() - denotes an optional parameters.\nEverything is case sensitive unless stated otherwise.",
      "```These help message will be removed in 10 minutes, you can always ask for help again.```"
    ];
    
    for( let system in userHelp ){
      for( let helpCommand in userHelp[system] ){
        let userHelpOutput = helpCommand + "```";
        userHelpOutput += userHelp[system][helpCommand].description + "\n\n"
        userHelpOutput += userHelp[system][helpCommand].command + "\n"
        userHelpOutput += userHelp[system][helpCommand].example + "\n\n"
        if( userHelp[system][helpCommand].params ){
          userHelpOutput += "Parameters:\n"
          for( let param in userHelp[system][helpCommand].params ){
            userHelpOutput += "*) " + param + ": " + userHelp[system][helpCommand].params[param] + "\n";
          }
        }
        

        userHelpOutput += "```";

        userHelpOutputArray.push( userHelpOutput );
      }
    }

    userHelpOutputArray.forEach( outputMesage => command.ServerReply( outputMesage, 60000 * 10, true ) );
  }

  async webToken( command ){
    let userData = await this.guildUsersDb.FindOne( { userId : command.user.id } );
    if( userData === null ){
      await this.guildUsersDb.Insert( {
        userId : command.user.id,
        username : command.user.username + "#" + command.user.discriminator,
        password : null,
        token : null,
        active : true,
        keys : []
      });
    }

    userData = await this.guildUsersDb.FindOne( { userId : command.user.id } );

    const token = {
      value : await this._RandomBytes( 64 ),
      time : new Date()
    };

    await this.guildUsersDb.Update( { _id : userData._id }, { $set : { token } } );

    command.ServerReply( `Your token is '${token.value}' and is valid for 1 hour, please login at tgcguild.com.`, 60000 * 5 );
    
  }

  async _RandomBytes( size ){
    return new Promise( ( resolve, reject ) => {
      crypto.randomBytes( 64, ( err, buf ) => {
        if( err ){
          reject( err );
        }
        else{
          resolve( buf.toString( "hex" ) );
        }
      } );
    } );
  }

  async uberWelcome( command ){
    
    let user = command.message.mentions.users.array()[0] || null;
    if( user !== null ){
      command.message.channel.send( `<@${command.user.id}> welcomes <@${user.id}>`)
    }
    
  }
  
};