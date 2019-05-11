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
    console.log( "channel length", allMessages.length );
    const message = allMessages[Math.floor(Math.random() * allMessages.length )];
    console.log( "outmessage", message );
    return message.content;
  }



  async Exec( bot, member ){
    console.log( "Request for quote" );
    let hasRecord = await this.bot.audit.HasUser( member.user.id );
    await this.bot.audit.GetUserRecord( member.user.id );
    const newMemberSnapy = await this._SaySnappyQuote();
    if( welcomeList.filter( x => x === member.user.id ).length === 0 ){
      welcomeList.push( member.user.id );
      bot.WriteMessage( "welcome", `Welcome${hasRecord ? " back" : ""} <@${member.user.id}>! ${newMemberSnapy}` );
      let role = member.guild.roles.find(role => role.name === "Untagged");
      member.addRole( role );
      setTimeout( () => welcomeList.splice( welcomeList.indexOf( member.user.id ), 1 ), 60000 * 2 );
    }
    else{
      console.log( "Member already got messaged." );
    }

    await this.bot.audit.CreateUserRecord( member );
  }

  get eventType(){
    return "guildMemberAdd";
  }
};

/*
< week | Welcome back @User.
< month | Welcome back @User, you were missed.
1-3 months | Welcome back @User, I've been waiting.
3-6 months | Welcome back @User, long time no see.
6-12 months | Welcome back @User, where ya been buddy.
> 1 year | DUDE! Look who's back! it's @User.
*/
