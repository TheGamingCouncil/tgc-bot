module.exports = class Collection{

  constructor( db, collectionName ){
    this.db = db;
    this.collectionName = collectionName;
    this.collection = this.db.collection( collectionName );
  }

  Find( selector = {}, options = {} ){
    return new Promise( ( resolve, reject ) => {
      this.collection.find( selector, options ).toArray( ( err, results ) => {
        if( !err ) {
          resolve( results.map( (result) => result ) );
        }
        else {
          reject( err );
        }
      } );
    });
  }

  async FindOne( selector = {}, options = {} ){
    return ( await this.Find( selector, options ) )[0] || null;
  }

  Update( selector, document, options = {} ) {
    return new Promise( ( resolve, reject ) => {
      this.collection.updateOne( selector, document, options, ( err, result ) => {
        if( !err ) {
          resolve( result );
        }
        else {
          reject(err);
        }
      });
    } );
  }

  Remove( selector = {} ){
    return new Promise( ( resolve, reject ) => {
      this.collection.deleteOne( selector, ( err, numberOfRemovedDocs ) => {
        if( !err ){
          resolve( numberOfRemovedDocs );
        }
        else{
          reject( err );
        }
      } );
    });
  }

  RemoveAll( selector = {} ){
    return new Promise( ( resolve, reject ) => {
      this.collection.deleteMany( selector, ( err, numberOfRemovedDocs ) => {
        if( !err ){
          resolve( numberOfRemovedDocs );
        }
        else{
          reject( err );
        }
      } );
    });
  }

  Insert( document, options = {} ) {
    return new Promise( ( resolve, reject ) => {
      this.collection.insertOne( document, options, ( err, result ) => {
        if( !err ) {
          resolve( result.ops[0] );
        }
        else {
          reject( err );
        }
      });
    });
  }

};
