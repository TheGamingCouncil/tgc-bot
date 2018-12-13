const Collection = require( "./collection" );
const mongodb = require('mongodb').MongoClient;

module.exports = class Database{
  constructor( dbHost, dbName ){
    this.dbHost = dbHost;
    this.dbName = dbName;
  }

  async Connect(){
    this.db = await this._ConnectToDatabaseMongo();
  }

  Collection( collectionName ){
    return new Collection( this.db, collectionName );
  }

  _ConnectToDatabaseMongo() {
    return new Promise( ( resolve, reject ) => {
      mongodb.connect( this.dbHost, { useNewUrlParser: true }, ( err, client ) => {
        if (err) {
          console.log("Mongo Database couldn't connect with error.");
          console.log(err);
          reject( err );
        }
        else {
          console.log("Mongo Database connected.");
          resolve( client.db( 'tcg' ) );
        }

      } );
    } );
  }
};