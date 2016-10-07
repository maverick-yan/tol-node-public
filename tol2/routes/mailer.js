// routes/mailer.js
var fs = require('fs');
var cors = require('cors');
var crypto = require('crypto');
var theType = require('type-of');
var nodemailer = require('nodemailer');
var sparkPostTransport = require('nodemailer-sparkpost-transport');
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
var email = secretKeys['email'];
var i42ListId = secretKeys['i42ListId'];

// GET - Test (root) - no CORS
router.get('/', function(req, res, next) {
    res.json({status: 'ONLINE'});
});

// Common console+logs for incoming POST for Mailchimp
var count = 0; // TODO: Get from db
function MCInitLog(req, routeName) {
    console.log( '\n' + GetDateTime() );
    console.log('####################################');
    console.log('[' + count + '] ToL: request to "' + 'mailchimp' + routeName + '" ..');
    console.log( '<< MC (REQ): ' + J(req.body, true) + '\n' );
    count++;
}


// ..........................................................................................
// Mailchimp SDK : API Calls

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// CALLBACK (Don't use this for webhooks)
var mcGenericCallback = function (err, data, req, res, customJson, routeName) {
    console.log('<< MC Callback (mailchimp' + routeName  + ')');
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
                "code": 200,
                "msg": "Success"
            });
        else if (customJson)
            res.json(customJson);
        else res.json({
            "code": 520,
            "msg": "Unknown Error"
        });
    }

}

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// WEBHOOK : Subscribe - Send a notification email to admin(s)
router.get('/webhook/subscribe', (req, res) => {
    MCInitLog(req, '/webhook/subscribe');
    res.sendStatus(200);
});

router.post('/webhook/subscribe', (req, res) => {
    MCInitLog(req, '/webhook/subscribe');
    var email = req.body["data"]["email"];	
    console.log(email)
    res.sendStatus(200);
});

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// REGISTER
router.post('/register', cors(corsOptions), (req, res) => {
    // Init
    MCInitLog(req, '/register');
    //var email = "dylanh724@gmail.com"; // TEST
    //var username = "dylanh724"; // TEST
    var email = req.body["email"];
    var username = req.body["username"];
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
       mcGenericCallback(err, data, req, res, null, '/register');
        
       // == POST-RES ==
       // Get # of subscribers
       MCGetListStatus( (memberCount) => {
           // Email admins with signup notification + updated # of subscribers (null res is only for GET test)
           SparkEmailSignupNotification(email, null, memberCount, username);
        });
    });
});

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// VERIFY EMAIL (if both exists + if verified)
router.post('/verifyemail', cors(corsOptions), (req, res) => {
    // Init
    MCInitLog(req, '/verifyemail');
    //var email = "dylanh724@gmail.com"; // TEST
    var email = req.body["email"];
    var emailMd5 = GetMd5(email);
    var url = `/lists/${i42ListId}/members/${emailMd5}`;

    console.log('MC: GET >> ' + url);
    mailchimp.get(url, {
        "email_address": email,
    }, (err, data) => {
        // Custom callback
        if (err) {
            console.log('[MC] **ERR @ "/verifyemail" callback:' + err);
            mcGenericCallback(err, data, req, res, null, '/verifyemail');
        } else {
            // Generic callback with custom json
            console.log('SUCCESS');
            var customJson = {
                "code": 200,
                "email_address": data["email_address"],
                "status": data["status"],
                "username": data["merge_fields"]["UNAME"],
                "timestamp_signup": data["timestamp_signup"],
                "timestamp_opt": data["timestamp_opt"]
            };
            mcGenericCallback(err, data, req, res, customJson, '/verifyemail');            
        }
    });
});

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// GET LIST STATUS (such as member_count)
function MCGetListStatus(callback) {
    console.log('[MC] Getting list status..');
    
    var url = `/lists/${i42ListId}`;    
    console.log('MC: GET >> ' + url);
    mailchimp.get(url, {
        // Only auth is needed (auto)
    }, (err, data) => {
        if (err)
            console.log('[MC] **ERR @ "/verifyemail" callback: ' + err);        
        else {
            var status = data["stats"];
            var memberCount = status["member_count"];
            console.log("[MC] Member Count: " + memberCount);
            if ( callback && typeof(callback) == "function" )
                callback(memberCount);
        }
    });
}

// ...........................................................................................
// SPARKPOST : with nodemailer >>
//
// SPARK :  Init
var sparkSecret = secretKeys['sparkPostApiKey'];
var adminEmails = secretKeys['adminEmails']; // []
console.log(adminEmails);

// create reusable transporter object using the default SMTP transport 
var options = {
    sparkPostApiKey: sparkSecret // Stored @ /tol2/data/secret-keys.json
    //campaign_id: 'optional',
    //metadata: 'optional',
    //options: 'optional'
};
var transporter = nodemailer.createTransport( sparkPostTransport(options) );

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// SPARK : Test GET - Send an email to your admins with a test subscriber
//router.get('/spark/test', (req, res) => {
//    MCInitLog(req, '/spark/test');
//    
//    // Get # of subscribers
//    MCGetListStatus( (memberCount) => {
//        // Email admins with signup notification + updated # of subscribers
//        SparkEmailSignupNotification("newTestSubscriber@gmail.com", res, memberCount, "testUsername");
//    });
//});

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// SPARK : Test GET - Send a custom email
//router.get('/spark/customtest', (req, res) => {
//    MCInitLog(req, '/spark/customtest');
//
//    // Get params
//    var emailTo = req.query.emailTo;
//    var emailSubj = req.query.emailSubj;
//    var emailBodyHtml = req.query.emailBodyHtml;
//    
//    // Logs
//    console.log(`emailTo: ${emailTo} / emailSubj: ${emailSubj} / emailBodyHtml: ${emailBodyHtml}`);
//    
//    // Send now
//    SparkSendEmail(emailTo, emailSubj, emailBodyHtml, res);
//});

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// SPARK : POST - Send a custom email
router.post('/spark/sendemail', cors(corsOptions), (req, res) => {
    MCInitLog(req, '/spark/sendemail');

    // Get params
    var emailTo = req.body.emailTo;
    var emailSubj = req.body.emailSubj;
    var emailBodyHtml = req.body.emailBodyHtml;

    // Logs
    console.log(`emailTo: ${emailTo} / emailSubj: ${emailSubj} / emailBodyHtml: ${emailBodyHtml}`);

    // Send now
    SparkSendEmail(emailTo, emailSubj, emailBodyHtml, res);
});

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// SPARK : Send a custom email to a user
function SparkSendEmail(emailTo, emailSubj, emailBodyHtml, res) {
    console.log('[Spark] Sending custom email..');

    transporter.sendMail({
        from: '"Imperium42" <noreply@imperium42.com>',
        to: emailTo, // []
        subject: emailSubj,
        //text: 'This is plaintext only - use html for now since our gamers will 99% use html',
        html: emailBodyHtml
    }, (err, info) => {
        if (err) {
            var errSend = '[MC] **ERR @ SparkSendEmail: ' + J(err);
            console.log(errSend);
            if (res)
                res.send(errSend);
        } else {
            console.log( '[Spark] Success: ' + J(info) );
            if (res)
            {
                var jsonRes = {
                    "success": true
                };
                res.json(jsonRes);
            }
        }
    });
}

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// SPARK : Send email to the admins (Username is a "merge_fields" custom MC field)
// TODO: Utilize SparkSendEmail()
function SparkEmailSignupNotification(email, res, memberCount, username) {
    console.log('[Spark] Sending signup notification email to admins..');
    
    transporter.sendMail({
        from: '"Imperium42" <noreply@imperium42.com>',
        to: adminEmails, // []
        subject: '[MC] +1 Subscriber (' + email + ') >> ' + memberCount + ' members!',
        text: 'Username: ' + username  + ' ~ Rock on, i42!',
        html: '<span style="font-weight:bold;">Username: </span>' + username + '<br><br>Rock On, i42!'
    }, (err, info) => {
        if (err) {
            var errSend = '[MC] **ERR @ SparkEmailSignupNotification: ' + J(err);
            console.log(errSend);
            if (res) 
                res.send(errSend);
        } else {
            console.log( '[Spark] Success: ' + J(info) );
            if (res)
                res.send('Success (' + info["accepted"]  + ')!')
        }
    });
}

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