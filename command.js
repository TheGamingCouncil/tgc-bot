module.exports = class Command{
  constructor( bot, user, message, content ){
    this.bot = bot;
    this.user = user;
    this.message = message;
    this.content = content;
    this.args = this.ExtractArguments( content );
    this.command = this.args[0];
    this.args.splice( 0, 1 );
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

  ValidateList( user, messageCommand, field, fieldName, list ){
    if( list.indexOf( field ) === -1 ){
      this.bot._ServerReply( user, `Invalid command argument issued '${messageCommand}':${fieldName}[${field}] supported - ${list.join( ',' )}` );
      return false;
    }

    return true;
  }

  ValidateValue( user, messageCommand, field, fieldName, validation ){
    if( field.match( validation ) === null ){
      this.bot._ServerReply( user, `Invalid command argument issued '${messageCommand}':${fieldName}[${field}] supported - ${validation}` );
      return false;
    }
    
    return true;
  }

  async ServerReply( message, decayTimer = 30000 ){
    const reply = await this.user.send( "```" + message + ".```\n\n```This message will self destruct in " + ( decayTimer / 1000 ) + " seconds.```" );
    this.bot.timers.AddDBTimer( "DeleteDM", new Date().getTime() + decayTimer, { userId : this.user.id, messageId : reply.id } );
  }

  AssetRoles( roles ){
    
  }

  AssetChannels( channels ){

  }
};