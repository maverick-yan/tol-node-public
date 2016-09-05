// routes/mailchimp.js
var fs = require('fs');
var cors = require('cors');
var Mailchimp = require('mailchimp-api-v3');
var express = require('express');
var router = express.Router();

// cors
var whitelist = ['https://throneoflies.com', 'https://www.throneoflies.com'];
var corsOptions = {
  origin: whitelist,
  optionsSuccessStatus: 200
};
router.options(whitelist, cors()); // include before other routes

// Read JSON keys file sync - You need to edit ./data/secret-keys-json with your own title+secret
var secretKeys = JSON.parse(fs.readFileSync('./data/secret-keys.json', 'utf8'));

// Mailchimp init
var mailchimp = new Mailchimp(secretKeys['mcApiKey']);

// GET - Test (root)
router.get('/', cors(corsOptions), function(req, res, next) {
  res.jsonp({status: 'ONLINE'});
});

// POST - Test (root)
router.post('/', cors(corsOptions), (req, res, next) => {    
  var email = req.body["Email"];
  console.log('POST request to "/"..');    
  res.header('content-type', 'application/json');    
  var json = {
    "test": email
  };
  res.send(email);
});

// Common console+logs for incoming POST for Mailchimp
var count = 0; // TODO: Get from db
function MCInitPost(req, routeName) {
  console.log( '\n' + GetDateTime() );
  console.log('####################################');
  console.log('[' + count + ']POST request to "' + routeName + '" ..');
  console.log( '<< MC (REQ): ' + J(req.body, true) + '\n' );
  count++;
}

// Handles all functions from Mailchimp that simply returns the "vanilla" result
function MCGenericCallback(res, err, data) {
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
// Mailchimp SDK : API Calls
//mailchimp.request({
//	  method : 'get|post|put|patch|delete',
//	  path : 'path for the call, see mailchimp documentation for possible calls'
//	  path_params : {
//		//path parameters, see mailchimp documentation for each call
//	  }
//	  body : {
//		//body parameters, see mailchimp documentation for each call
//	  },
//	  query : {
//		//query string parameters, see mailchimp documentation for each call
//	  }
//	}, callback)

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// CALLBACK
var callback = function (err, result) {
  if (err) {
    console.log('error', err);
  }
  console.log(result);
  process.exit(0);
}

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// REGISTER
router.post('/register', cors(corsOptions), (req, res) => {
    // Init
    MCInitPost(req, '/register');
	var email = req.body["email"];
	var username = req.body["username"];

    // Send MC Request
	mailchimp.request({
		method : 'post',
		path : '/lists/f5951a907e/members',
		path_params : {}
	}
	  body : {
		"email_address": email,
		"email_type": "html",
		"status": "pending",
		"merge_fields": {
			"EMAIL": email,
			"UNAME": username
	  },
	}, callback)
});

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// VERIFY THAT EMAIL EXISTS
// TODO


// ...........................................................................................
// Misc Functions // TODO: Export this to use throughout
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
