const Event = require( "../abstract/event" );
const Command = require( "../command" );

module.exports = class Commands extends Event{
  async Init(){
    this.commands = this.bot.commands;
    this.auditsDb = this.db.Collection( "user-audits" );
  }

  async Exec( bot, message ){
    if( !message.author.bot && message.type !== "GUILD_MEMBER_JOIN" ){
      this.bot.audit.AddRecentText( message.channel.name, message.author );
      if( message.content.startsWith( "tgc" ) ){
        await message.delete();
        const command = new Command( bot, message.author, message, message.content.substring( 4 ) );
        if( this.commands[command.command] ){
          this.commands[command.command].method.apply( this.commands[command.command].object, [ command, ...command.args ] );
        }
        else{
          command.ServerReply( `Invalid command issued '${command.command}'` );
        }
      }
    }
    
  }

  get eventType(){
    return "message";
  }
};