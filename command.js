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

  ValidateList( field, fieldName, list ){
    if( list.indexOf( field ) === -1 ){
      this.ServerReply( `Invalid command argument issued '${this.command}':${fieldName}[${field}] supported - ${list.join( ',' )}` );
      return false;
    }

    return true;
  }

  ValidateValue( field, fieldName, validation, friendly ){
    if( field.match( validation ) === null ){
      this.ServerReply( `Invalid command argument issued '${this.command}':${fieldName}[${field}] supported - ${friendly}` );
      return false;
    }
    
    return true;
  }

  ServerReply( message, decayTimer = 30000 ){
    this.bot.DmUser( this.user, message, decayTimer );
  }

  AssertRoles( roles ){
    const userRoles = this.message.member.roles.map( x => x.name );
    if( roles.filter( x => userRoles.indexOf( x ) === -1 ).length === 0 ){
      return true;
    }
    else{
      this.ServerReply( `Invalid role for command issued '${this.command}'`  );
      return false;
    }
  }

  AssertChannels( channels ){
    if( channels.filter( x => x === this.message.channel.name ).length > 0 ){
      return true;
    }
    else{
      this.ServerReply( `Invalid channel for command issued '${this.command}':'${this.message.channel.name}'`  );
      return false;
    }
  }
};