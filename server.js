const spawn = require('child_process').spawn;

require( "command-daemon" ).startup( {
  config: __dirname + "/config.json",
  cli : [
    
  ],
  services : [
    {
      name : "discord-bot",
      execute : ( bootstrap ) => {
        require( './index' );
      }
    }
  ]
} );
