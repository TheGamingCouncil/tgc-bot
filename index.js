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
    this.events = {};
    this.welcomeList = [];
    this._SetupEvents();
    
  }

  _SetupEvents(){
    this._OnNewMember();
    this._OnByeMember();

    this._ListenForEvent( [ "*" ], "help", ( user, message ) => {
      this._ServerReply( user, `At this point my help is weak as the only supported command is help. So I really can't help you.`  );
    } );

    this._SetupMessageListeners();
    //this._ListenForEvent( [ "*" ], "event" );
  }

  _OnNewMember(){
    //const newMemberSnapy = 
    this.client.on( "guildMemberAdd", member => {
      if( this.welcomeList.filter( x => x === member.user.id ).length === 0 ){
        this.welcomeList.push( member.user.id );
        this.WriteMessage( "social-lobby", `Welcome <@${member.user.id}>! I have even more cookies!` );
        setTimeout( () => this.welcomeList.splice( this.welcomeList.indexOf( member.user.id ), 1 ), 30000 );
      }
    } );
  }

  _OnByeMember(){
    this.client.on( "guildMemberRemove", member => {
      const aka = `AKA(${member.nickname || member.username})`;
      this.WriteMessage( "social-lobby", `A member has left our ranks! Let us all sing a song and remember the good times we had with ${member.user.tag} ${aka}!` );
    } );
  }

  GetChannelsByName( name ){
    return this.client.channels.filter( x => x.name === name ).array();
  }

  GetUserByName( name ){
    return this.client.users.filter( x => x.username === name ).array();
  }

  WriteMessage( channel, message ){
    if( typeof( channel ) === "string" ){
      channel = this.GetChannelsByName( channel );
    }

    channel.forEach( x => x.send( message ) );
  }

  UserHasPermission( user, roleName ){

  }

  _ListenForEvent( supportedChannels, command, method ){
    this.events[command] = {
      supportedChannels,
      method
    };
  }

  _SetupMessageListeners(){
    this.client.on( "message", async ( message ) => {
      if( message.content.startsWith( "tgc" ) ){
        await message.delete();
        let messageBody = message.content.substring( 4 ).split( " " );
        let messageCommand = messageBody[0] || "unknown";
        messageBody.splice( 0, 1 );
        if( this.events[messageCommand.toLowerCase()] ){
          const command = this.events[messageCommand.toLowerCase()];
          if( command.supportedChannels.filter( x => x === "*" || x === message.channel.name ).length > 0 ){
            command.method.apply( this, [ message.author, message, ...messageBody ] );
          }
          else{
            this._ServerReply( message.author, `Invalid channel for command issued '${messageCommand}':'${message.channel.name}'`  );
          }
        }
        else{
          this._ServerReply( message.author, `Invalid command issued '${messageCommand}'` );
        }
        
      }
    });
  }

  async _ServerReply( user, message, decayTimer = 30000 ){
    let reply = await user.send( "```" + message + ".```\n\n```This message will self destruct in " + ( decayTimer / 1000 ) + " seconds.```" );
    setTimeout( () => reply.delete(), decayTimer );
  }

  IsListeningChannel(){

  }

}