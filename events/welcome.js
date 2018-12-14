const Event = require( "../abstract/event" );
const quotes = require( "../data/things-to-say" );

module.exports = class Welcome extends Event{

  async Init(){
    this.welcomeList = [];
  }

  _SaySnappyQuote(){
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

  _OnNewMember(){
    this.client.on( "guildMemberAdd", member => {
      const newMemberSnapy = this._SaySnappyQuote();
      if( this.welcomeList.filter( x => x === member.user.id ).length === 0 ){
        this.welcomeList.push( member.user.id );
        this.WriteMessage( "social-lobby", `Welcome <@${member.user.id}>! ${newMemberSnapy}` );
        setTimeout( () => this.welcomeList.splice( this.welcomeList.indexOf( member.user.id ), 1 ), 30000 );
      }
    } );
  }

  async Exec( bot, member ){
    const newMemberSnapy = this.SaySnappyQuote();
    if( this.welcomeList.filter( x => x === member.user.id ).length === 0 ){
      this.welcomeList.push( member.user.id );
      bot.WriteMessage( "social-lobby", `Welcome <@${member.user.id}>! ${newMemberSnapy}` );
      setTimeout( () => this.welcomeList.splice( this.welcomeList.indexOf( member.user.id ), 1 ), 30000 );
    }
  }

  get eventType(){
    return "guildMemberAdd";
  }
};