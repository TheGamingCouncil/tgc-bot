const moment = require( "moment" );

module.exports = class TGCTimers{
  constructor( client, db ){
    this.client = client;
    this.db = db;
    this._timerMethods = {};
    this._runAtTimers = [];
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

  _GetNextRunAtTime( hour, minute ){
    let time = moment().hour( hour ).minute( minute ).second( 0 ).millisecond( 0 );
    if( moment().hour() > hour || ( moment().hour() === hour && moment().minute() >= minute ) ){
      time = moment().add( 1, 'days' ).hour( hour ).minute( minute ).second( 0 ).millisecond( 0 );
    }
    return new Date( time ).getTime();
  }

  async AddRunAtTimer( id, hour, minute, method ){
    this._runAtTimers.push( {
      id,
      hour,
      minute,
      nextRun : 0,
      method
    } );
  }

  _AddDefaultTimers(){
    this.AddTimerMethod( "DeleteDM", async ( item ) => {
      const user = await this.client.users.filter( x => x.id === item.userId ).array()[0] || null;
      if( user !== null ){
        if( user.dmChannel === null ){
          await user.createDM();
        }
        let message = null;
        try{
          message = ( await user.dmChannel.fetchMessage( item.messageId ) ) || null;
        }
        catch( ex ){
          //Throw away//
        }
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

    const time = ( new Date() ).getTime();
    for( let i = 0; i < this._runAtTimers.length; i++ ){
      if( this._runAtTimers[i].nextRun < time ){
        this._runAtTimers[i].nextRun = this._GetNextRunAtTime( this._runAtTimers[i].hour, this._runAtTimers[i].minute );
        try{
          this._runAtTimers[i].method();
        }
        catch( ex ){
          console.error( "Chould not run event", this._runAtTimers[i], ex );
        }
      }
    }

    setTimeout( () => this._TimerSystem(), 1000 );
  }
};