// Init
console.log('Node Started..');
var PORT = 55555;

var fs = require('fs');
var csv = require('fast-csv');
var https = require('https');
var express = require('express');
var bodyParser = require('body-parser');
var MongoClient = require('mongodb').MongoClient;
var cors = require('express-cors');
var crypto = require('crypto');
var CryptoJS = require('crypto-js');
var Base64 = require('crypto-js/enc-base64');
var PlayFabClient = require('./playfab-node/PlayFabClient.js');
var gameSparks = new require('./gamesparks-node/GameSparks.js');

var app = express();

// Use SSL
https.createServer({
  key: fs.readFileSync('./ssl/key.pem'),
  cert: fs.readFileSync('./ssl/cert.pem')
}, app).listen(PORT);

console.log('Listening on PORT ' + PORT);

// Allow JSON queries
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

// Read JSON keys file sync
var secretKeys = JSON.parse(fs.readFileSync('./data/secret-keys.json', 'utf8'));

// Read CSV (for example, CD keys)
//fs.createReadStream('data/dmt-keys.csv')
//  .pipe(csv())
//  .on('data', function(data) {
//    //console.log(data);
//    for (var i=0; i<data.length; i++)
//      console.log(data[i]);
//  })
//  .on('end', function(data) {
//    console.log('Read finished');
//  });

// Allow CORS
app.use(cors({
  allowedOrigins: [
    '*.throneoflies.com', '*.imperium42.com'
  ]
}));

// ############################################################################
// PlayFab SDK
// ############################################################################
//
// Init
var pfTitleId = secretKeys['pfTitleId'];
var pfSecret = secretKeys['pfSecret'];
PlayFabClient.settings.titleId = pfTitleId;
PlayFabClient.settings.developerSecretKey = pfSecret;

// Common console+logs for incoming POST for PlayFab
function PFInitPost(req, routeName) {
  console.log( '\n' + GetDateTime() );
  console.log('####################################');
  console.log('POST request to "/pf-loginwithfb" ..');
  console.log( '<< PF (REQ): ' + J(req.body, true) + '\n' );
}

// https://api.playfab.com/Documentation/Client/method/LoginWithFacebook
app.post('/pf-loginwithfb', (req, res) => {
  // Init
  PFInitPost(req, '/pf-loginwithfb');
  
  // Send
  PlayFabClient.LoginWithFacebook(req.body, (err, data) => {
	// Callback >>
    if (err) {
      // Fail
      console.log( 'PF (PF_ERR): ' + J(err, true) + ' >>' );
      res.send(data);

    } else if (data) {
      // Success
      console.log( 'PF (RESULT): ' + J(data, true) + ' >>' );
      res.send(data);

    } else {
      // (?) Something went wrong -- null..?
      console.log('PF (UNKNOWN_ERR): Null..? >>');
      if (!err) err = {
        "err": 'unknown'
      };
      res.send(err);
    }
    
    // Done
    console.log('####################################');
    res.end();
  });
});

// ##############################################################################
// GameSparks SDK
// ##############################################################################
var gsApiKey = secretKeys['gsApiKey'];
var gsSecret = secretKeys['gsSecret'];
var socketCount = 50;

gameSparks.initPreviewListener(gsApiKey, gsSecret, socketCount, onMessage, onInit);

function onInit(res) {
	console.log('GS (onInit): ' + res);
}

function onMessage(res) {
	console.log( 'GS (onMessage): ' + JSON.stringify(res) );
}

// GET - Default
app.get('/', (req, res) => {
  console.log('GET request to "/"..');
  res.header('Content-type', 'text/html');
  return res.end('<h1>Welcome to the Throne of Lies API</h1>' +
  '<h2>Check back later for public routes.</h2>');
});

// POST -- GS Secret
app.post('/gs-secret', (req, res) => {
  console.log('POST request to "/gs-secret" with data:');
  console.log(req.body);
  var nonce = req.body.nonce;

  if (nonce) {
    var algorithm = 'sha256';
    var hmac = crypto.createHmac(algorithm, nonce)
      .update(gsSecret)
      .digest('base64');
   
    var json = {
    "gs": hmac
    };
    
    console.log("GS: Sending " + J(json, true) + " >>");
    res.send( json );
    res.end();
  
  } else { 
    var json = {
      "gs": "ERROR_NO_NONCE"
    };
    
    res.send(json);
    res.end();
  } 
});

// POST -- Keys testing
//app.post('/keys', (req, res) => {
//  console.log('User is requesting key..');
//  console.log(req.body);
//    var date = new Date();
//  db.collection('keys').save(req.body, (err, result) => {
//    if (err) return console.log(err);
//
//    console.log('saved to database');
//    res.send('aaa-bbb-ccc');
//  });
//});


// MongoDB testing
//var db;
//var mongoUrl = 'mongodb://something';

//MongoClient.connect(mongoUrl, (err, database) => {
//  if (err) return console.log(err);
//  db = database;
//  app.listen(3000, () => {
//    console.log('Listening on 3000')
//  })
//})

// Lazy JSON.Stringify()
function J(obj, pretty) {
  if (!pretty)
    return JSON.stringify(obj); // js obj >> json
  else
    return JSON.stringify(obj, null, 2); // Better for logs+humans
}

// Simple date
function GetDateTime() {
  return new Date().toISOString().
    replace(/T/, ' ').      // replace T with a space
    replace(/\..+/, '');    // delete the dot and everything after
}