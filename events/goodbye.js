const Event = require( "../abstract/event" );

module.exports = class Welcome extends Event{

  async Exec( bot, member ){
    const aka = `AKA(${member.nickname || member.user.username})`;
    bot.WriteMessage( "social-lobby", `A member has left our ranks! Let us all sing a song and remember the good times we had with ${member.user.tag} ${aka}!` );
  }

  get eventType(){
    return "guildMemberRemove";
  }
};