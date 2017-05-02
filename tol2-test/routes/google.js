// routes/google.js
var fs = require('fs');
var vors = require('cors');
var express = require('express');
var cors = require('cors');
var router = express.Router();
// var GoogleSpreadsheet = require("google-sheets-node-api");
var Spreadsheet = require('edit-google-spreadsheet');
var tolCommon = require('./scripts/tolCommon');

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
var driveKeys = secretKeys.google.drive;
var sheetId = driveKeys.spreadsheetId;
console.log('sheetId==' + sheetId);

// ############################################################################
// Google Sheets setup
// https://www.npmjs.com/package/google-sheets-node-api
var creds = driveKeys.authJson;

// ............................................................................
function sheetTest()
{
    console.log('[GOOGLE] @ sheetTest');

    var oauth2Info =
    {
        client_id: driveKeys.authJson.client_id,
        client_secret: driveKeys.authJson.private_key,
        refresh_token: driveKeys.authJson.refresh_token
    }
    console.log('oauth2Info==' + tolCommon.J(oauth2Info));

    Spreadsheet.load({
        debug: true,
        // spreadsheetName: 'node-edit-spreadsheet',
        spreadsheetId: sheetId,
        // spreadsheetId: '1234',
        worksheetName: 'Sheet1',
        // // OR 2. OAuth
        // oauth : {
        //     email: 'my-name@google.email.com',
        //     keyFile: 'my-private-key.pem'
        // },

        // OR 3. OAuth2 (See get_oauth2_permissions.js)
        oauth2: {
            client_id: driveKeys.authJson.client_id,           // generated-id.apps.googleusercontent.com
            client_secret: driveKeys.authJson.client_secret,
            refresh_token: driveKeys.authJson.refresh_token
        },

        // OR 4. Static Token
        // accessToken: {
        //     type: 'Bearer',
        //     token: 'my-generated-token'
        // },

        // OR 5. Dynamic Token
        // accessToken: function(callback) {
        //     //... async stuff ...
        //     callback(null, token);
        // }
    }, function sheetReady(err, spreadsheet) {
        console.log('DONE');
        if(err)
        {
            console.log('ERR: ' + err);
            throw err;
        }

        spreadsheet.add({ 3: { 5: "hello!" } });

        spreadsheet.send(function(err) {
            if(err) throw err;
            console.log("Updated Cell at row 3, column 5 to 'hello!'");
        });
    });
}

// ............................................................................
// GET Test
router.get('/', (req, res) =>
{
    sheetTest();
    // res.sendStatus(200);
});

// ............................................................................
module.exports =
{
    myRouter: router
};