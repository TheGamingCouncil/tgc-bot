const Event = require( "../abstract/event" );

module.exports = class AutoMod extends Event{
  async Init(){

    this.userMessageAutoRemove = [
      "guild-events",
      "lottery-rolls",
      "combat-metrics-screenshots"
    ];
    this.userMediaAutoRemove = [
      "social-lobby",
      "guild-events",
      "needed-item-requests",
      "removed-for-inactivity",
      "officer-business"
    ];
    this.userBotAllowed = [
      "bot-commands",
      "bot-trashbox"
    ];
    this.kawaiiBotAllowed = [
      "raidgroup-alpha",
      "raidgroup-charlie",
      "arkchat",
      "dungeonsanddragons",
      "swtor",
      "staff-lounge",
      "lottery-rolls",
      "the-council-table",
      "bot-commands"
    ];
  }

  _listHasChannel( list, channelName ){
    return list.filter( x => channelName.endsWith( x ) ).length > 0;
  }

  async Exec( bot, message ){
    if( message.author.bot ){
      if( message.author.username.startsWith( "The Gaming Council" ) ){
        return;
      }

      if( message.author.username.indexOf( "KawaiiBot" ) !== -1 && this._listHasChannel( this.kawaiiBotAllowed, message.channel.name ) ){
        return;
      }
  
      if( !this._listHasChannel( this.userBotAllowed, message.channel.name ) ){
        await message.delete();
        return;
      }
    }

    if( message.content.startsWith( "tgc" ) ){
      return;
    }

    if( message.content.startsWith( "!" ) ){
      if( !this._listHasChannel( this.userBotAllowed, message.channel.name ) ){
        await message.delete();
        bot.DmUser( message.author, `Bot commands other then the tgc bot commands are not allowed in '${message.channel.name}'.` );
      }
      return;
    }
    else if( message.content.startsWith( "+" ) ){
      if( !this._listHasChannel( this.kawaiiBotAllowed, message.channel.name ) ){
        await message.delete();
        bot.DmUser( message.author, `Kawaii bot commands are not allowed in '${message.channel.name}'.` );
      }
      return;
    }

    if( message.attachments.array().length > 0 && this._listHasChannel( this.userMediaAutoRemove, message.channel.name ) ){
      await message.delete();
      bot.DmUser( message.author, `Attachments are not allowed to be posted in '${message.channel.name}'.` );
      return;
    }
    
    if( message.attachments.array().length === 0 && this._listHasChannel( this.userMessageAutoRemove, message.channel.name ) ){
      await message.delete();
      bot.DmUser( message.author, `Messages are not allowed to be posted in '${message.channel.name}'.` );
      return;
    }
  }

  get eventType(){
    return "message";
  }
};
