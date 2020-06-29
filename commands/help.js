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
      command : "web",
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

  async dbclear( command ){
    let dbToClear = this.db.Collection( "botEvents" );
    let removedDocuments = await dbToClear.RemoveAll( { type : "chat" } );
    command.ServerReply( `Database cleared ${removedDocuments} records.`, 60000 * 2, true );
    
  }

  async web( command ){
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

    command.ServerReply( `Please setup your password below. This message and link are valid for 1 hour, please login at tgcguild.com.\n\nhttp://tgcguild.com/app/login/${encodeURI(command.user.username) + "%23" + command.user.discriminator}/${token.value}`, 60000 * 60, true );
    
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
