const Event = require( "../abstract/event" );
const Command = require( "../command" );

module.exports = class AutoMod extends Event{
  async Init(){
    this.eventDb = this.db.Collection( "events" );
  }

  async Exec( bot, messageReaction, user ){
    if( !user.username.startsWith( "The Gaming Council" )){
      let eventPost = await this.eventDb.FindOne( { postId : messageReaction.message.id } );
      if( eventPost !== null ){
        messageReaction.remove( user.id );
        let fakeCommand = new Command( bot, user, "", "" );
        switch( messageReaction._emoji.name ){
          case "cancel_signup":
            bot.commands["cancelsignup"].method.call( bot.commands["cancelsignup"].object, fakeCommand, eventPost.tag );
            break;
          case "signup_tank_role":
            bot.commands["signup"].method.call( bot.commands["signup"].object, fakeCommand, eventPost.tag, "tank" );
            break;
          case "signup_dps_role":
            bot.commands["signup"].method.call( bot.commands["signup"].object, fakeCommand, eventPost.tag, "dps" );
            break;
          case "signup_healer_role":
            bot.commands["signup"].method.call( bot.commands["signup"].object, fakeCommand, eventPost.tag, "healer" );
            break;
          case "signup_any_role":
            bot.commands["signup"].method.call( bot.commands["signup"].object, fakeCommand, eventPost.tag, "any" );
            break;
          case "signup_reserve_role":
            bot.commands["signup"].method.call( bot.commands["signup"].object, fakeCommand, eventPost.tag, "reserve" );
            break;
        }
      }
    }
    
  }

  get eventType(){
    return "messageReactionAdd";
  }
};