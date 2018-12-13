module.exports = class Event{

  constructor( bot, db, timers ){
    this.bot = bot;
    this.db = db;
    this.timers = timers;
  }

  async Init(){

  }

  async Exec(){

  }

  get eventType(){
    return null;
  }

  SetEventMethod( eventMethod ){
    this.method = eventMethod;
  }
};