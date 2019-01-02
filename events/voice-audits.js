const Event = require( "../abstract/event" );

module.exports = class VoiceAudits extends Event{
  async Init(){
  }

  async Exec( bot, oldMemberState, newMemberState ){
    const lastVoiceChannel = oldMemberState.voiceChannel || { name : null, id : null };
    const currentVoiceChannel = newMemberState.voiceChannel || { name : null, id : null };
    
    const guild = bot.client.guilds.array()[0];
    
    if( currentVoiceChannel.name !== null ){
      this.bot.audit.AddRecentChannel( currentVoiceChannel.name, newMemberState.user );
    }

    if( lastVoiceChannel.name === null && currentVoiceChannel.name !== null ){
      await this.bot.audit.UpdateVoiceState( true, newMemberState.user, guild.afkChannelID === currentVoiceChannel.id );
    }
    else if( lastVoiceChannel.name !== null && currentVoiceChannel.name !== null ){
      await this.bot.audit.UpdateVoiceState( true, newMemberState.user, guild.afkChannelID === currentVoiceChannel.id );
    }
    else if( lastVoiceChannel.name !== null && currentVoiceChannel.name === null ){
      await this.bot.audit.UpdateVoiceState( false, newMemberState.user, false );
    }

  }

  get eventType(){
    return "voiceStateUpdate";
  }
};