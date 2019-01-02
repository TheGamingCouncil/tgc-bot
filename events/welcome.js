const Event = require( "../abstract/event" );
//const quotes = require( "../data/things-to-say" );

const welcomeList = [];

module.exports = class Welcome extends Event{

  async Init(){
  }

  async _SaySnappyQuote(){
    /*let openers = Object.keys( quotes.statements );
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

    return fullQuote;*/

    const optionChannel = this.bot.GetChannelByName( "bot-sayings" );
    await this.bot.SuperFetch( optionChannel, 1000 );
    const allMessages = optionChannel.messages.array();
    const message = allMessages[Math.floor(Math.random() * allMessages.length )];
    return message.content;
  }



  async Exec( bot, member ){
    let userAuditRecord = await this.bot.audit.GetUserRecord( member.user.id );
    const newMemberSnapy = await this._SaySnappyQuote();
    if( welcomeList.filter( x => x === member.user.id ).length === 0 ){
      welcomeList.push( member.user.id );
      bot.WriteMessage( "social-lobby", `Welcome${userAuditRecord !== null ? " BACK" : ""} <@${member.user.id}>! ${newMemberSnapy}` );
      setTimeout( () => welcomeList.splice( welcomeList.indexOf( member.user.id ), 1 ), 60000 * 2 );
    }

    await this.bot.audit.CreateUserRecord( member );
  }

  get eventType(){
    return "guildMemberAdd";
  }
};