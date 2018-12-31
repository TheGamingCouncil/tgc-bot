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
  }

  get eventType(){
    return "message";
  }
};