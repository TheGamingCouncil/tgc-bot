//DO NOT COMMIT CODE HERE
const config = require( "./config" );

const Discord = require("discord.js");
const client = new Discord.Client();

client.on("ready", () => {
  // This event will run if the bot starts, and logs in, successfully.
  console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`); 
  // Example of changing the bot's playing game to something useful. `client.user` is what the
  // docs refer to as the "ClientUser".
  client.user.setActivity( `Waiting for commands` );


  const tgcBot = new TGCBot( client );

  //const user = tgcBot.GetUserByName( "navstev0" );
  //console.log( user );

  //tgcBot.WriteMessage( "bot-trashbox", "at test <@183450121642573834>" );
  //tgcBot.WriteMessage( "social-lobby", `Beep beep` );
});



client.login( config.token );

class TGCBot{
  constructor( client ){
    this.client = client;
    this._SetupEvents();
    
  }

  _SetupEvents(){
    this._OnNewMember();
    this._OnByeMember();
  }

  _OnNewMember(){
    this.client.on( "guildMemberAdd", member => {
      this.WriteMessage( "social-lobby", `Welcome <@${member.user.id}>! I have even more cookies!` );
    } );
  }

  _OnByeMember(){
    this.client.on( "guildMemberRemove", member => {
      this.WriteMessage( "social-lobby", `A member has left our ranks! Let us all sing a song and remember the good times we had with <@${member.user.id}>!` );
    } );
  }

  GetChannelByName( name ){
    return this.client.channels.filter( x => x.name === name ).array()[0] || null;
  }

  GetUserByName( name ){
    return this.client.users.filter( x => x.username === name ).array()[0] || null;
  }

  WriteMessage( channel, message ){
    if( typeof( channel ) === "string" ){
      channel = this.GetChannelByName( channel );
    }
    if( channel !== null ){
      channel.send( message );
    }
    else{
      //console.log( channel );
    }
  }

}