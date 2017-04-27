// ...........................................................................................
// routes/discord.js
var fs = require('fs');
var cors = require('cors');
var express = require('express');
var router = express.Router();
var tolCommon = require('./scripts/tolCommon');
var tolMailer = require('./mailer');
var discordWebhook = require('discord-webhooks');

// cors
var whitelist = ['https://throneoflies.com', 'https://www.throneoflies.com, https://api.throneoflies.com'];
var corsOptions = {
  origin: whitelist,
  optionsSuccessStatus: 200
};
router.options(whitelist, cors()); // include before other routes

// Read JSON keys file sync - You need to edit ./data/secret-keys-json with your own title+secret
var secretKeys = JSON.parse(fs.readFileSync('./data/secret-keys.json', 'utf8'));

// Discord setup
// https://www.npmjs.com/package/discord-webhooks
let stripeWebhook = new discordWebhook('https://discordapp.com/api/webhooks/306096637695229952/xgN-I4YumdLhGUv2mdpeCJwL-LVIMiEN1zT845AwjolzrwnWWPt4a0RDU_HC0t1XjAJY');

// ...........................................................................................
// GET: Discord test
router.get('/', function(req, res) =>
{
    res.send('testt');
});

// ...........................................................................................
// Discord test
function discordTest()
{
    myWebhook.execute({
        content:"Hello from a webhook",
        username:"Mr Webhook",
        avatar_url:"https://example.com/image.png"
    });
}

// ...........................................................................................
// Discord err handling
myWebhook.on("error", (error) => {
  console.warn(error);
});

// ...........................................................................................
// POST - Process charge, then show results
router.post('/stripe', function(req, res)
{
  console.log( '[Webhook] params == ' + tolCommon.J(req.params) );
  console.log( '[Webhook] body == ' + tolCommon.J(req.body) );

  console.log('@ /discord/stripe POST (Webhook)');

  res.sendStatus(200);
});

module.exports = router;