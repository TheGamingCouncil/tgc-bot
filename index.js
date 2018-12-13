//DO NOT COMMIT CODE HERE
const config = require( "./config" );

require( "./prototypes" );

const Database = require( "./db/database" );
const TGCBot = require( "./tgc-bot" );
const TGCTimers = require( "./tgc-timers" );

const Discord = require("discord.js");
const client = new Discord.Client();

client.on("ready", async () => {

  const db = new Database( config.dbHost, "tgc" );
  await db.Connect();

  // This event will run if the bot starts, and logs in, successfully.
  console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`); 
  // Example of changing the bot's playing game to something useful. `client.user` is what the
  // docs refer to as the "ClientUser".
  client.user.setActivity( `Waiting for commands` );

  const tgcTimers = new TGCTimers( client, db );
  const tgcBot = new TGCBot( client, db, tgcTimers );
  await tgcBot.PerformSetup();
  tgcTimers.StartTimerSystem();

  //tgcBot.UpdateAllEvents();

  //const user = tgcBot.GetUserByName( "navstev0" );
  //console.log( user );

  //console.log( tgcBot.client.users.filter( x => x.username === "navstev0" ).array()[0] );

  //const dmChannel = await tgcBot.client.users.filter( x => x.username === "navstev0" ).array()[0].createDM();
  //console.log( ( await dmChannel.fetchMessages() ).array().forEach( x => x.delete() ) );

  //console.log( tgcBot.client.guilds.array()[0].members.filter( x => x.user.username === "navstev0" ).array()[0].user.dmChannel );

  //tgcBot.WriteMessage( "bot-trashbox", "at test <@183450121642573834>" );
  //let message = await tgcBot.WriteMessage( "social-lobby", `Beep beep` );
  //tgc createEvent "My Event" "my super special event" monday 11:30 0 1 1 2 false
});


client.login( config.token );

