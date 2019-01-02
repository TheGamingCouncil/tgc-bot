const welcome = require( "./welcome" );
const goodbye = require( "./goodbye" );
const commands = require( "./commands" );
const automod = require( "./automod" );
const voiceAudit = require( "./voice-audits" );

module.exports = [
  welcome,
  goodbye,
  commands,
  automod,
  voiceAudit
];