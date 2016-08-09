console.log('Node Started..');
var PORT = 55555; // You can change this
var fs = require('fs'); // Filestream
var https = require('https'); // Create secure HTTPS server
var express = require('express'); // The main web handler
var bodyParser = require('body-parser'); // Allows for querying JSON formats
var cors = require('express-cors'); // Cross-Origin access rules

var app = express();

// Use SSL -- must have your own certificates at ./ssl/ (both key.pem and cert.pem). You may need to Google this.
var options;
var server;

try {
  options = {
    key: fs.readFileSync( './ssl/key.pem' ),
    cert: fs.readFileSync( './ssl/cert.pem' )
  }
  
  server = https.createServer(options, app).listen(PORT, function() {
    console.log("Listening on port " + PORT);
  });	  
} 

catch (e) {
    console.log("**WARNING: You forgot to copy your 'key.pem' and 'cert.pem' SSL/TLS files to /tol/data/");
}

// Allow JSON queries
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

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
    return res.send('' +
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