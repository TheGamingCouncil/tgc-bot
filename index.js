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
});


client.login( config.token );

