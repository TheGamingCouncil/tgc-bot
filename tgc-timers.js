module.exports = class TGCTimers{
  constructor( client, db ){
    this.client = client;
    this.db = db;
    this._timerMethods = {};
    this.timerDb = this.db.Collection( "timers" );
    this._AddDefaultTimers();
  }

  async AddDBTimer( method, removeDate, objectDetails ){
    await this.timerDb.Insert( {
      method,
      removeDate,
      ...objectDetails
    });
  }

  _AddDefaultTimers(){
    this.AddTimerMethod( "DeleteDM", async ( item ) => {
      const user = await this.client.users.filter( x => x.id === item.userId ).array()[0] || null;
      if( user !== null ){
        if( user.dmChannel === null ){
          await user.createDM();
        }
        
        let message = ( await user.dmChannel.fetchMessages() ).array().filter( x => x.id === item.messageId )[0] || null;
        if( message !== null ){
          await message.delete();
        }
      }
    });
  }

  AddTimerMethod( name, method ){
    this._timerMethods[name] = method;
  }

  StartTimerSystem(){
    this._TimerSystem();
  }

  async _TimerSystem(){
    let timedEvents = await this.timerDb.Find( { removeDate : { $lt : ( new Date() ).getTime() } } );

    for( let i = 0; i < timedEvents.length; i++ ){
      try{
        await this._timerMethods[timedEvents[i].method]( timedEvents[i] );
      }
      catch( ex ){
        console.error( "Could not execute timed event", timedEvents[i], ex );
      }
      
      //Remove event//
      await this.timerDb.Remove( { _id : timedEvents[i]._id } );
    }

    setTimeout( () => this._TimerSystem(), 1000 );
  }
};