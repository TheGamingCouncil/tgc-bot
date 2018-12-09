const spawn = require('child_process').spawn;

require( "command-daemon" ).startup( {
  cli : [
    
  ],
  services : [
    {
      name : "discord-bot",
      pushDebug : true,
      execute : ( bootstrap ) => {
        require( './index' );
      }
    }
  ]
} );