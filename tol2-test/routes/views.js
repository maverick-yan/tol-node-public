// routes/views.js
//var fs = require('fs');
var cors = require('cors');
var path = require('path');
var settings = require('settings');
var theType = require('type-of');
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
//var secretKeys = JSON.parse(fs.readFileSync('./data/secret-keys.json', 'utf8'));

// Common console+logs for incoming POST for Mailchimp
var count = 0; // TODO: Get from db
function MCInitLog(req, routeName) {
    console.log( '\n' + GetDateTime() );
    console.log('####################################');
    console.log('[' + count + '] ToL: request to "' + 'views' + routeName + '" ..');
    console.log( '<< VIEWS (REQ): ' + J(req.body, true) + '\n' );
    count++;
}

// ...........................................................................
// GET - Test (root) - no CORS
router.get('/', function(req, res, next) {
    res.json({status: 'ONLINE'});
});


// ...........................................................................
// GET : Company Email Signature >>
router.get('/signature', (req, res) => {
    MCInitLog(req, '/signature');
    
    var htmlPath = settings.PROJECT_DIR + '/views/signature.jade';
    res.render(htmlPath);
});

// ...........................................................................
// Simple date for logs
function GetDateTime() {
    return new Date().toISOString()
    .replace(/T/, ' ') // replace T with a space
    .replace(/\..+/, ''); // delete the dot and everything after
}

// ...........................................................................
// Lazy JSON.Stringify() for pretty logs and debugging
function J(obj, pretty) {
  if (!pretty)
    return JSON.stringify(obj); // js obj >> json
  else
    return JSON.stringify(obj, null, 2); // Better for logs+humans
}

// module.exports = router;
module.exports =
{
    myRouter: router
};
