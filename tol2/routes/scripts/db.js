// routes/scripts/db.js
var fs = require('fs');
var vors = require('cors');
var express = require('express');
var cors = require('cors');
var mongodb = require('mongodb');
var router = express.Router();
var tolCommon = require('./tolCommon');

// cors
var whitelist =
[
    'https://throneoflies.com',
    'https://www.throneoflies.com',
    'https://api.throneoflies.com'
];
var corsOptions =
{
    origin: whitelist,
    optionsSuccessStatus: 200
};
router.options(whitelist, cors()); // include before other routes

// Read JSON keys file sync - You need to edit ./data/secret-keys-json with your own title+secret
var secretKeys = JSON.parse(fs.readFileSync('./data/secret-keys.json', 'utf8'));
var mongoSecrets = secretKeys.mongo;
var mongoSecretURI = mongoSecrets.uri;

// ##########################################################################################
// INIT MONGO :  Create seed data
var seedData = [
  {
    decade: '1970s',
    artist: 'Debby Boone',
    song: 'You Light Up My Life',
    weeksAtOne: 10
  },
  {
    decade: '1980s',
    artist: 'Olivia Newton-John',
    song: 'Physical',
    weeksAtOne: 10
  },
  {
    decade: '1990s',
    artist: 'Mariah Carey',
    song: 'One Sweet Day',
    weeksAtOne: 16
  }
];

// Standard URI format: mongodb://[dbuser:dbpassword@]host:port/dbname
mongodb.MongoClient.connect(mongoSecretURI, (err, db) =>
{
  if(err) throw err;
  
  /*
   * First we'll add a few songs. Nothing is required to create the 
   * songs collection; it is created automatically when we insert.
   */

  var songs = db.collection('songs');

  // Note that the insert method can take either an array or a dict.
  songs.insert(seedData, (err, result) =>
  {
    if(err) throw err;

    /*
     * Then we need to give Boyz II Men credit for their contribution
     * to the hit "One Sweet Day".
     */

    songs.update(
      { song: 'One Sweet Day' }, 
      { $set: { artist: 'Mariah Carey ft. Boyz II Men' } }, (err, result) =>
    {
        if(err) throw err;

        /*
         * Finally we run a query which returns all the hits that spend 10 or
         * more weeks at number 1.
         */

        songs.find({ weeksAtOne : { $gte: 10 } }).sort({ decade: 1 }).toArray((err, docs) =>
        {
          if(err) throw err;

          docs.forEach((doc) =>
          {
            console.log(
              'In the ' + doc['decade'] + ', ' + doc['song'] + ' by ' + doc['artist'] + 
              ' topped the charts for ' + doc['weeksAtOne'] + ' straight weeks.'
            );
          });
         
          // Since this is an example, we'll clean up after ourselves.
          songs.drop((err) =>
          {
            if(err) throw err;
           
            // Only close the connection when your app is terminating.
            db.close((err) =>
            {
              if(err) throw err;
            });
          });
        });
      }
    );
  });
});