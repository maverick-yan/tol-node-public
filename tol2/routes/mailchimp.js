// routes/mailchimp.js
var fs = require('fs');
var cors = require('cors');
var crypto = require('crypto');
var theType = require('type-of');
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
var i42ListId = secretKeys['i42ListId'];

// GET - Test (root)
router.get('/', function(req, res, next) {
    res.json({status: 'ONLINE'});
});

// Common console+logs for incoming POST for Mailchimp
var count = 0; // TODO: Get from db
function MCInitPost(req, routeName) {
    console.log( '\n' + GetDateTime() );
    console.log('####################################');
    console.log('[' + count + '] ToL: POST request to "' + routeName + '" ..');
    console.log('<< MC (REQ): ' + J(req.body, true) + '\n');
    count++;
}


// ..........................................................................................
// Mailchimp SDK : API Calls

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// CALLBACK
var mcGenericCallback = function (err, data, req, res, customJson) {
    console.log("<< MC Callback");
    if (err) {
        console.log('**MC: ERR >> ', J(err));
        var errStatusCode = 520 // Unknown fallback
        if (err['status'] && theType(err['status'] == 'number'))
            errStatusCode = err['status'];
        res.status(errStatusCode);
        if (req.accepts('json'))
            res.json(err);
        else
            res.type('txt').send(J(err));
    } else {
        // Success
        console.log("MC: SUCCESS >>");
        console.log(J(data));
        if (!customJson && data && data['statusCode'] == 200)
            res.json({
                "statusCode": 200,
                "msg": "Success"
            });
        else if (customJson)
            res.json(customJson);
        else res.json({
            "statusCode": 520,
            "msg": "Unknown Error"
        });
    }
}

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// REGISTER
router.post('/register', cors(corsOptions), (req, res) => {
    // Init
    MCInitPost(req, '/register');
    var email = "dylanh724@gmail.com"; // TEST
    var username = "dylanh724"; // TEST
    // var email = req.body["email"];
    // var username = req.body["username"];
    var emailMd5 = GetMd5(email);
    var url = `/lists/${i42ListId}/members/${emailMd5}`;

    console.log("MC: PUT >> " + url);
    mailchimp.put(url, {
        "email_address": email,
        "status": "pending",
        "merge_fields": {
            "EMAIL": email,
            "UNAME": username
        }
    }, (err, data) => {
        // Generic callback + res
        mcGenericCallback(err, data, req, res);
    });
});

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// VERIFY EMAIL (if both exists + if verified)
router.post('/verifyemail', cors(corsOptions), (req, res) => {
    // Init
    MCInitPost(req, '/verifyemail');
    var email = "dylanh724@gmail.com"; // TEST
    // var email = req.body["email"];
    var emailMd5 = GetMd5(email);
    var url = `/lists/${i42ListId}/members/${emailMd5}`;

    console.log("MC: GET >> " + url);
    mailchimp.get(url, {
        "email_address": email,
    }, (err, data) => {
        // Custom callback
        if (err) {
            console.log('ERR');
            mcGenericCallback(err, data, req, res);
        } else {
            // Generic callback with custom json
            console.log('SUCCESS');
            var customJson = {
                "email_address": data['email_address'],
                "status": data['status'],
                "username": data['merge_fields']['UNAME'],
                "timestamp_signup": data['timestamp_signup'],
                "timestamp_opt": data['timestamp_opt']
            };
            mcGenericCallback(err, data, req, res, customJson);    
        }
    });
});

// ...........................................................................................
// Email to md5
function GetMd5(email)
{
    var md5 = crypto.createHash('md5').update(email).digest("hex");
    console.log(`[md5] ${email} >> ${md5}`);
    return md5;
}

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