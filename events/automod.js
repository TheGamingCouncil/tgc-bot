const Event = require( "../abstract/event" );

module.exports = class AutoMod extends Event{
  async Init(){
    
  }

  async Exec( bot, message ){
    const noAttachmentChannels = [
      "social-lobby"
    ];
    if( noAttachmentChannels.indexOf( message.channel.name ) !== -1 && message.attachments.array().length > 0 ){
      await message.delete();
      bot.DmUser( message.author, `Attachments are not allowed to be posted in '${message.channel.name}'. Please post social attachments in 'crapbox', 'the-nerd-corner', 'post-your-pets', 'gallery', or 'thememelobby'` );
    }
    
    if( ( ( !message.author.username.startsWith( "The Gaming Council" ) && message.author.bot ) || !message.author.bot ) && !message.content.startsWith( "tgc" ) && message.channel.name === "guild-events" ){
      await message.delete();
    }

    if( message.content.startsWith( "!" ) && message.channel.name !== "bot-commands" ){
      bot.DmUser( message.author, `Bot commands other then the tgc bot commands are only allowed to be posted in the 'bot-commands' channel. Please post any bot commands that are not tgc bot commands in 'bot-commands'.` );
      await message.delete();
    }

    if( message.channel.name !== "bot-commands" && message.channel.name !== "bot-trashbox" && message.author.bot && !message.author.username.startsWith( "The Gaming Council" ) ){
      await message.delete();
    }
  }

  get eventType(){
    return "message";
  }
};