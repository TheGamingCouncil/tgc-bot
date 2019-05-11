const Event = require( "../abstract/event" );

const goodbyeList = [];

module.exports = class Goodbye extends Event{

  async Exec( bot, member ){
    if( goodbyeList.filter( x => x === member.user.id ).length === 0 ){
      goodbyeList.push( member.user.id );
      const aka = `AKA(${member.nickname || member.user.username})`;
      bot.WriteMessage( "server-left-log", `A member has left our ranks! Let us all sing a song and remember the good times we had with ${member.user.tag} ${aka}!` );
      setTimeout( () => goodbyeList.splice( goodbyeList.indexOf( member.user.id ), 1 ), 60000 * 2 );
      await this.bot.audit.ArchiveUserRecord( member.user.id );
    }
    
  }

  get eventType(){
    return "guildMemberRemove";
  }
};
