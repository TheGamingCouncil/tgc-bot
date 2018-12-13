const Command = require( "../abstract/command" );


module.exports = class Help extends Command{
  async Init(){

  }

  async help( command ){
    command.ServerReply( `At this point my help is weak as the only supported command is help. So I really can't help you.`  );
  }
  
};