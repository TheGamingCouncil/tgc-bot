const Discord = require("discord.js");
const moment = require( "moment" );

const maxHistory = 20;
const updateFrequincy = 10000//60000;

module.exports = class AuditSystem{
  constructor( bot, db ){
    this.bot = bot;
    this.db = db;
    this.memberAudits = this.db.Collection( "user-audits" );
  }

  async InitAudits(){
    let activeUsers = await this.memberAudits.Find( { archive : false } );
    let activeUserIds = activeUsers.map( user => user.userId );
    let realActiveMembers = this.bot.client.guilds.array()[0].members.array();
    let realActiveMemberIds = realActiveMembers.map( member => member.user.id );
    for( let i = 0; i < activeUsers.length; i++ ){
      const user = activeUsers[i];
      if( realActiveMemberIds.indexOf( user.userId ) === -1 ){
        await this.ArchiveUserRecord( user.userId );
      }
      else{
        await this.UpdateUserState( realActiveMembers.filter( member => member.user.id === user.userId )[0], user );
      }
    }
    for( let i = 0; i < realActiveMembers.length; i++ ){
      const member = realActiveMembers[i];
      if( activeUserIds.indexOf( member.user.id ) === -1 && member.user.bot === false ){
        await this.CreateUserRecord( member );
      }
    }

    //this.UpdateRecords();
  }

  async UpdateUserState( memberState ){

    const guild = this.bot.client.guilds.array()[0];

    if( memberState.voiceChannelID ){
      const voiceChannel = guild.channels.array().filter( x => x.id === memberState.voiceChannelID )[0];
      await this.AddRecentChannel( voiceChannel.name, memberState.user );
      await this.UpdateVoiceState( true, memberState.user, voiceChannel.id === guild.afkChannelID )
    }
    
  }

  async UpdateVoiceState( voiceIsOn, user, afk ){
    const userData = await this.GetUser( user.id );
    if( voiceIsOn && userData.voiceState === false ){
      userData.voiceState = true;
      await this.memberAudits.Update( { _id : userData._id }, { $set : {
        voiceState : afk ? "afk" : true,
        stateTimestamp : new Date()
      }});
    }
    else if( voiceIsOn && userData.voiceState === "afk" && !afk ){
      let addedSeconds = Math.round( ( new Date() - userData.stateTimestamp ) / 1000 );
      await this.memberAudits.Update( { _id : userData._id }, { $set :{
        voiceState : true,
        stateTimestamp : new Date(),
        timeInAfk : addedSeconds + userData.timeInAfk
      }});
    }
    else if( voiceIsOn && userData.voiceState !== "afk" && afk ){
      let addedSeconds = Math.round( ( new Date() - userData.stateTimestamp ) / 1000 );
      await this.memberAudits.Update( { _id : userData._id }, { $set :{
        voiceState : "afk",
        stateTimestamp : new Date(),
        timeInVoice : addedSeconds + userData.timeInVoice
      }});
    }
    else if( !voiceIsOn && userData.voiceState === "afk" ){
      let addedSeconds = Math.round( ( new Date() - userData.stateTimestamp ) / 1000 );
      await this.memberAudits.Update( { _id : userData._id }, { $set :{
        voiceState : false,
        stateTimestamp : new Date(),
        timeInAfk : addedSeconds + userData.timeInAfk
      }});
    }
    else if( !voiceIsOn && userData.voiceState === true ){
      let addedSeconds = Math.round( ( new Date() - userData.stateTimestamp ) / 1000 );
      await this.memberAudits.Update( { _id : userData._id }, { $set :{
        voiceState : false,
        stateTimestamp : new Date(),
        timeInVoice : addedSeconds + userData.timeInVoice
      }});
    }
  }

  async HasUser( userId ){
    const userData = await this.memberAudits.FindOne( { userId } );
    return userData !== null;
  }

  async GetUser( userId ){
    const userData = await this.memberAudits.FindOne( { userId } );
    if( userData === null ){
      const member = await this.bot.client.guilds.array()[0].fetchMember( userId );
      await this.CreateUserRecord( member );
      return await this.memberAudits.FindOne( { userId } );
    }

    return userData;
  }

  async AddRecentChannel( channelName, user ){
    const userData = await this.GetUser( user.id );
    if( userData ){
      userData.recentVoiceActivity.push( { channel: channelName, time : new Date() } );
      if( userData.recentVoiceActivity.length > maxHistory ){
        userData.recentVoiceActivity.splice( 0, 1 );
      }
      await this.memberAudits.Update( { _id : userData._id }, { $set : { recentVoiceActivity : userData.recentVoiceActivity, lastActive : new Date() }});
    }
  }

  async AddRecentText( channelName, user ){
    const userData = await this.GetUser( user.id );
    if( userData ){
      userData.recentTextActivity.push( { channel: channelName, time : new Date() } );
      if( userData.recentTextActivity.length > maxHistory ){
        userData.recentTextActivity.splice( 0, 1 );
      }
      await this.memberAudits.Update( { _id : userData._id }, { $set : { recentTextActivity : userData.recentTextActivity, lastActive : new Date() }});
    }
  }

  async ArchiveUserRecord( userId ){
    const userData = await this.GetUser( userId );
    if( userData ){
      await this.memberAudits.Update( { _id : userData._id }, { $set : {
        archive : true,
        leaveDate : new Date()
      } });
    }
  }

  async GetUserRecord( userId ){
    return await this.GetUser( userId );
  }

  async CreateUserRecord( member ){
    const userData = await this.memberAudits.FindOne( { userId : member.user.id } );
    if( userData === null ){
      await this.memberAudits.Insert( {
        userId : member.user.id,
        username : member.user.username + "#" + member.user.discriminator,
        archive : false,
        timeInVoice : 0,
        timeInAfk : 0,
        voiceState : member.voiceChannel ? true : false,
        stateTimestamp : new Date(),
        joinDate : member.joinedTimestamp,
        leaveDate : -1,
        recentVoiceActivity : [],
        recentTextActivity : [],
        lastActive : 0
      } );
    }
    else{
      if( userData.archive === true ){
        await this.memberAudits.Update( { _id : userData._id }, { $set : {
          archive : false,
          leaveDate : -1
        } } );
      }
    }

    await this.UpdateUserState( member );
  }

  /*async UpdateRecords(){

    //Active Records//
    let activeUsers = await this.memberAudits.Find( { archive : false } );
    let channel = this.bot.GetChannelByName( "member-audits" );
    for( let i = 0; i < activeUsers.length; i++ ){
      const user = activeUsers[i];
      let auditPost = await channel.fetchMessage( user.auditPost );
      let recentVoiceText = "-";
      if( user.recentVoiceActivity.length > 0 ){
        recentVoiceText = "";
        user.recentVoiceActivity.reverse().forEach( ( activity, index ) => {
          let r = index + 1;
          recentVoiceText += moment( activity.time ).format( "L LT" ) + "(" + activity.channel + ")" + ( r % 2 === 0 ? "\n" : " - " )
        });
      }
      let recentUserText = "-";
      if( user.recentTextActivity.length > 0 ){
        recentUserText = "";
        user.recentTextActivity.reverse().forEach( ( activity, index ) => {
          let r = index + 1;
          recentUserText += moment( activity.time ).format( "L LT" ) + "(" + activity.channel + ")" + ( r % 2 === 0 ? "\n" : " - " )
        });
      }
      
      let embed = new Discord.RichEmbed()
        .addField( "User", `<@${user.userId}>`, true )
        .addField( "Last Active", `${user.lastActive === 0 ? 'Never' : moment( user.lastActive ).format( "MMM Do YYYY" )}`, true )
        .addField( "Join Date", moment( user.joinDate ).format( "MMM Do YYYY" ), true )
        .addField( "Hours in Voice", `${user.timeInVoice > 0 ? parseFloat((user.timeInVoice / 60 ) / 60).toFixed(4) : "Never"}`, true )
        .addField( "Hours in AFK", `${user.timeInAfk > 0 ? parseFloat((user.timeInAfk / 60 ) / 60).toFixed(4) : "Never"}`, true )
        .addField( "-", "-", true )
        .addField( "Recent Voice Activity", recentVoiceText, false )
        .addField( "Recent Text Activity", recentUserText, false );

      auditPost.edit( embed );
    }

    await this.memberAudits.Update( { dirty : true, archive : false }, { $set : { dirty : false } } );

    //Archive Records//

    setTimeout( () => this.UpdateRecords(), updateFrequincy );
  }*/
}

