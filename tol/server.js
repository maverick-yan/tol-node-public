// ##############################################################################################
// Created June, 2016
// Created by dylan@imperium42.com (Imperium42 Game Studio)
// Created for Throne of Lies: The Online Game of Lies and Deceit @ https://www.ThroneofLies.com
// Like what you see? Toss us some love <3 by support our game ^
// ##############################################################################################

// Init
console.log('Node Started..');
var PORT = 55555; // You can change this

var fs = require('fs'); // Filestream
//var csv = require('fast-csv'); // [OPTIONAL/EXPERIMENTAL] Read CSV files
var https = require('https'); // Create secure HTTPS server
var express = require('express'); // The main web handler
var bodyParser = require('body-parser'); // Allows for querying JSON formats
//var MongoClient = require('mongodb').MongoClient; // [OPTIONAL/EXPERIMENTAL] NoSQL DB
var cors = require('express-cors'); // Cross-Origin access rules
//var crypto = require('crypto'); // [OPTIONAL/EXPERIMENTAL] Integrated cryptography library for hash/encrypt
//var Base64 = require('crypto-js/enc-base64'); // [OPTIONAL/EXPERIMENTAL] Extension to Crypto for Base64 algorithms
var PlayFabClient = require('./playfab-node/PlayFabClient.js');	// PlayFab BaaS SDK
//var gameSparks = new require('./gamesparks-node/GameSparks.js'); // GameSparks BaaS SDK

var app = express();

// Use SSL -- must have your own certificates at ./ssl/ (both key.pem and cert.pem). You may need to Google this.
try {
  https.createServer({
    key: fs.readFileSync('./ssl/key.pem'),
    cert: fs.readFileSync('./ssl/cert.pem')
  }, app).listen(PORT);	
  console.log('Listening on PORT ' + PORT);
} catch (e) {
	console.log("**WARNING: You forgot to copy your 'key.pem' and 'cert.pem' SSL/TLS files to /tol/data/");
}

// Allow JSON queries
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

// Read JSON keys file sync - You need to edit ./data/secret-keys-json with your own title+secret
try {
  var secretKeys = JSON.parse(fs.readFileSync('./data/secret-keys.json', 'utf8'));
} catch (err) {
  console.log("**WARNING: You forgot to make 'secret-keys.json' @ /tol/data/");
}

// EXPERIMENTAL: Read CSV (for example, CD keys)
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

// Allow CORS : Put your own sites here
app.use(cors({
  allowedOrigins: [
    '*.throneoflies.com', '*.imperium42.com'
  ]
}));

// Lazy JSON.Stringify() for pretty logs and debugging
function J(obj, pretty) {
    if (!pretty)
        return JSON.stringify(obj);             // js obj >> json
    else
        return JSON.stringify(obj, null, 2);    // Better for logs+humans
}

// Simple date for logs
function GetDateTime() {
    return new Date().toISOString()
        .replace(/T/, ' ')      // replace T with a space
        .replace(/\..+/, '');   // delete the dot and everything after
}

// GET - Default (root)
app.get('/', (req, res) => {
    console.log('GET request to "/"..');
    res.header('content-type', 'text/html');
    return res.end('' +
        '<h1>Welcome to the <a href="http://throneofli.es/game">Throne of Lies</a> API</h1>' +
        '<h2>Check back later for public routes.</h2>');
});

// POST - Test (root)
app.post('/', (req, res) => {
    console.log('POST request to "/"..');
    res.header('content-type', 'application/json');
    //for (var key in req.body) {
    //    console.log( 'FOUND KEY: ' + J(key) );
    //}
    var json = {
      "test": "complete!"
    };
    res.send(json);
});

// ##############################################################################################
// PlayFab SDK

// Init - The title/secret will be obtained from the JSON file above
var pfTitleId = secretKeys['pfTitleId'];
var pfSecret = secretKeys['pfSecret'];
PlayFabClient.settings.titleId = pfTitleId;
PlayFabClient.settings.developerSecretKey = pfSecret;

// Common console+logs for incoming POST for PlayFab
function PFInitPost(req, routeName) {
  console.log( '\n' + GetDateTime() );
  console.log('####################################');
  console.log('POST request to "' + routeName + '" ..');
  console.log( '<< PF (REQ): ' + J(req.body, true) + '\n' );
}

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// Handles all functions from PlayFab that simply returns the "vanilla" value
function PFGenericCallback(res, err, data) {
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
}

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// https://api.playfab.com/Documentation/Client/method/LoginWithPlayFab
app.post('/pf-loginwithpf', (req, res) => {
    // Init
    PFInitPost(req, '/pf-loginwithpf');

    // Send
    PlayFabClient.LoginWithPlayFab(req.body, (err, data) => {
        PFGenericCallback(res, err, data);
    });
});

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// https://api.playfab.com/Documentation/Client/method/LoginWithEmailAddress
app.post('/pf-loginwithemail', (req, res) => {
    // Init
    PFInitPost(req, '/pf-loginwithemail');

    // Send
    PlayFabClient.LoginWithEmailAddress(req.body, (err, data) => {
        PFGenericCallback(res, err, data);
    });
});

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// https://api.playfab.com/Documentation/Client/method/GetAccountInfo
app.post('/pf-getacctinfo', (req, res) => {
    // Init
    PFInitPost(req, '/pf-getacctinfo');

    // Send
    PlayFabClient.GetAccountInfo(req.body, (err, data) => {
        PFGenericCallback(res, err, data);
    });
});

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// https://api.playfab.com/Documentation/Client/method/RegisterPlayFabUser
app.post('/pf-regpfuser', (req, res) => {
    // Init
    PFInitPost(req, '/pf-regpfuser');

    // Send
    PlayFabClient.RegisterPlayFabUser(req.body, (err, data) => {
        PFGenericCallback(res, err, data);
    });
});

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// https://api.playfab.com/Documentation/Client/method/LoginWithFacebook
app.post('/pf-loginwithfb', (req, res) => {
    // Init
    console.log("TEST @ /pf-loginwithfb");
    PFInitPost(req, '/pf-loginwithfb');

    // Send
    PlayFabClient.LoginWithFacebook(req.body, (err, data) => {
        PFGenericCallback(res, err, data);
    });
});

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// https://api.playfab.com/Documentation/Client/method/LinkFacebookAccount
app.post('/pf-linkfbacct', (req, res) => {
    // Init
    PFInitPost(req, '/pf-linkfbacct');

    // Send
    PlayFabClient.LinkFacebookAccount(req.body, (err, data) => {
        PFGenericCallback(res, err, data);
    });
});

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// https://api.playfab.com/Documentation/Client/method/UnlinkFacebookAccount
app.post('/pf-unlinkfbacct', (req, res) => {
    // Init
    PFInitPost(req, '/pf-unlinkfbacct');

    // Send
    PlayFabClient.LinkFacebookAccount(req.body, (err, data) => {
        PFGenericCallback(res, err, data);
    });
});

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// https://api.playfab.com/Documentation/Client/method/RedeemCoupon
app.post('/pf-redeemcoupon', (req, res) => {
    // Init
    PFInitPost(req, '/pf-redeemcoupon');

    // Send
    PlayFabClient.RedeemCoupon(req.body, (err, data) => {
        PFGenericCallback(res, err, data);
    });
});

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// https://api.playfab.com/Documentation/Client/method/GetUserInventory
app.post('/pf-getuserinv', (req, res) => {
    // Init
    PFInitPost(req, '/pf-getuserinv');

    // Send
    PlayFabClient.GetUserInventory(req.body, (err, data) => {
        PFGenericCallback(res, err, data);
    });
});

// ##############################################################################################
// EXPERIMENTAL: GameSparks SDK

//var gsApiKey = secretKeys['gsApiKey'];
//var gsSecret = secretKeys['gsSecret'];
//var socketCount = 50;
//
//gameSparks.initPreviewListener(gsApiKey, gsSecret, socketCount, onMessage, onInit);
//
//function onInit(res) {
//	console.log('GS (onInit): ' + res);
//}
//
//function onMessage(res) {
//	console.log( 'GS (onMessage): ' + JSON.stringify(res) );
//}
//
//
//// POST -- Encrypt GS secret >> Send it back
//app.post('/gs-secret', (req, res) => {
//  console.log('POST request to "/gs-secret" with data:');
//  console.log(req.body);
//  var nonce = req.body.nonce;
//
//  if (nonce) {
//    var algorithm = 'sha256';
//    var hmac = crypto.createHmac(algorithm, nonce)
//      .update(gsSecret)
//      .digest('base64');
//
//    var json = {
//	  "gs": hmac
//    };
//
//    console.log("GS: Sending " + J(json, true) + " >>");
//    res.send( json );
//    res.end();
//
//  } else {
//    var json = {
//      "gs": "ERROR_NO_NONCE"
//    };
//
//    res.send(json);
//    res.end();
//  }
//});

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