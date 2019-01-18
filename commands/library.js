const Command = require( "../abstract/command" );

module.exports = class Help extends Command{
  async Init(){
    this.libraryDb = this.db.Collection( "library" );
  }

  async wtfis( command, acronym ){
    let recordedAcronym = acronym;
    acronym = acronym.toLowerCase();
    let acronymDetails = (await this.libraryDb.Find( { acronym } ))[0] || null;
    let dswitch = "";
    if( acronymDetails === null ){
      dswitch = acronym.substring( 0, 1 ) === "n" ? "Normal " : "Veteran "; 
      acronymDetails = (await this.libraryDb.Find( { acronym : acronym.substring( 1 ), hasVetNormalSwitch : true } ))[0] || null;
    }
    if( acronymDetails !== null ){
      command.ServerReply( `${recordedAcronym} is ${dswitch}${acronymDetails.description}`, 60000 * 5 );
    }
    else{
      command.ServerReply( `Unable to find a meaning for the acronym ${acronym}` );
    }
  }

}//tgc updateLibrary hrc "Hel Ra Citadel" true
