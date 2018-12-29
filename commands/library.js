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

  async updateLibrary( command, acronym, description, hasVetNormalSwitch ){
    let recordedAcronym = acronym;
    acronym = acronym.toLowerCase();
    hasVetNormalSwitch = hasVetNormalSwitch === "true";
    if( command.AssertRoles( [ "Librarian" ] ) ){
      let acronymDetails = (await this.libraryDb.Find( { acronym } ))[0] || null;
      if( acronymDetails === null ){
        await this.libraryDb.Insert( { acronym, description, hasVetNormalSwitch } );
        command.ServerReply( `Library acronym ${recordedAcronym} added` );
      }
      else{
        await this.libraryDb.Update( { _id : acronymDetails._id }, { $set : { description, hasVetNormalSwitch }} );
        command.ServerReply( `Library acronym ${recordedAcronym} updated` );
      }
    }
  }

  async removeLibrary( command, acronym ){
    let recordedAcronym = acronym;
    acronym = acronym.toLowerCase();
    if( command.AssertRoles( [ "Librarian" ] ) ){
      let acronymDetails = (await this.libraryDb.Find( { acronym } ))[0] || null;
      if( acronymDetails !== null ){
        await this.libraryDb.Remove( { _id : acronymDetails._id } );
        command.ServerReply( `Library acronym ${recordedAcronym} has been removed` );
      }
      else{
        command.ServerReply( `Library acronym not found ${recordedAcronym}` );
      }
    }
  }

}//tgc updateLibrary hrc "Hel Ra Citadel" true