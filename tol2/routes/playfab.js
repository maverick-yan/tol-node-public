// ...........................................................................................
// routes/playfab.js
var fs = require('fs');
var PlayFabClient = require('../playfab-node/PlayFabClient.js'); // PlayFab BaaS SDK
var express = require('express');
var router = express.Router();

// Read JSON keys file sync - You need to edit ./data/secret-keys-json with your own title+secret
var secretKeys = JSON.parse(fs.readFileSync('./data/secret-keys.json', 'utf8'));

// GET - Test (root)
router.get('/', function(req, res, next) {
  res.send('Welcome to tol-pf: You are probably not authorized to be here ;)');
});

// POST - Test (root)
router.post('/', (req, res) => {    
  var email = req.body["Email"];
  console.log('POST request to "/"..');    
  res.header('content-type', 'application/json');    
  var json = {
    "test": email
  };
  res.send(email);
});

// ...........................................................................................
// PlayFab SDK : Core
// Init - The title/secret will be obtained from the JSON file above
var count = 0;
var pfTitleId = secretKeys['pfTitleId'];
var pfSecret = secretKeys['pfSecret'];
PlayFabClient.settings.titleId = pfTitleId;
PlayFabClient.settings.developerSecretKey = pfSecret;

// Common console+logs for incoming POST for PlayFab
function PFInitPost(req, routeName) {
  console.log( '\n' + GetDateTime() );
  console.log('####################################');
  console.log('[' + count + ']POST request to "' + routeName + '" ..');
  console.log( '<< PF (REQ): ' + J(req.body, true) + '\n' );
  count++;
}

// Handles all functions from PlayFab that simply returns the "vanilla" value
function PFGenericCallback(res, err, data) {
    if (err) {
        // Fail
        console.log( 'PF (PF_ERR): ' + J(err, true) + ' >>' );
        res.send(err);
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
}

// ..........................................................................................
// PlayFab SDK : API Calls
// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// https://api.playfab.com/Documentation/Client/method/LoginWithPlayFab
router.post('/loginwithpf', (req, res) => {
    // Init
    PFInitPost(req, '/loginwithpf');

    // Send
    PlayFabClient.LoginWithPlayFab(req.body, (err, data) => {
        PFGenericCallback(res, err, data);
    });
});

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// https://api.playfab.com/Documentation/Client/method/LoginWithEmailAddress
router.post('/loginwithemail', (req, res) => {
    // Init
    PFInitPost(req, '/loginwithemail');

    // Send
    PlayFabClient.LoginWithEmailAddress(req.body, (err, data) => {
        PFGenericCallback(res, err, data);
    });
});

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// https://api.playfab.com/Documentation/Client/method/GetAccountInfo
router.post('/getacctinfo', (req, res) => {
    // Init
    PFInitPost(req, '/getacctinfo');

    // Send
    PlayFabClient.GetAccountInfo(req.body, (err, data) => {
        PFGenericCallback(res, err, data);
    });
});

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// https://api.playfab.com/Documentation/Client/method/RegisterPlayFabUser
router.post('/regpfuser', (req, res) => {
    // Init
    PFInitPost(req, '/regpfuser');

    // Send
    PlayFabClient.RegisterPlayFabUser(req.body, (err, data) => {
        PFGenericCallback(res, err, data);
    });
});

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// https://api.playfab.com/Documentation/Client/method/LoginWithFacebook
router.post('/loginwithfb', (req, res) => {
    // Init
    PFInitPost(req, '/loginwithfb');

    // Send
    PlayFabClient.LoginWithFacebook(req.body, (err, data) => {
        PFGenericCallback(res, err, data);
    });
});

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// https://api.playfab.com/Documentation/Client/method/LinkFacebookAccount
router.post('/linkfbacct', (req, res) => {
    // Init
    PFInitPost(req, '/linkfbacct');

    // Send
    PlayFabClient.LinkFacebookAccount(req.body, (err, data) => {
        PFGenericCallback(res, err, data);
    });
});

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// https://api.playfab.com/Documentation/Client/method/UnlinkFacebookAccount
router.post('/unlinkfbacct', (req, res) => {
    // Init
    PFInitPost(req, '/unlinkfbacct');

    // Send
    PlayFabClient.LinkFacebookAccount(req.body, (err, data) => {
        PFGenericCallback(res, err, data);
    });
});

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// https://api.playfab.com/Documentation/Client/method/RedeemCoupon
router.post('/redeemcoupon', (req, res) => {
    // Init
    PFInitPost(req, '/redeemcoupon');

    // Send
    PlayFabClient.RedeemCoupon(req.body, (err, data) => {
        PFGenericCallback(res, err, data);
    });
});

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// https://api.playfab.com/Documentation/Client/method/GetUserInventory
router.post('/getuserinv', (req, res) => {
    // Init
    PFInitPost(req, '/getuserinv');

    // Send
    PlayFabClient.GetUserInventory(req.body, (err, data) => {
        PFGenericCallback(res, err, data);
    });
});

// ...........................................................................................
// Misc Functions
// Lazy JSON.Stringify() for pretty logs and debugging
function J(obj, pretty) {
  if (!pretty)        
    return JSON.stringify(obj); // js obj >> json    
  else        
    return JSON.stringify(obj, null, 2); // Better for logs+humans
  }
    
// Simple date for logs
function GetDateTime() {
  return new Date().toISOString()
    .replace(/T/, ' ') // replace T with a space       
    .replace(/\..+/, ''); // delete the dot and everything after
}

module.exports = router;
