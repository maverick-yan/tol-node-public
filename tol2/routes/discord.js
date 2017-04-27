// ...........................................................................................
// routes/discord.js
var fs = require('fs');
var cors = require('cors');
var express = require('express');
var router = express.Router();
var tolCommon = require('./scripts/tolCommon');
var tolMailer = require('./mailer');
var request = require('request');

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
var discordWebhookUrls = secretKeys.discordWebhookUrls;

// ############################################################################################
// Discord setup >>
/*
 _________________________________________________________________________
 https://discordapp.com/developers/docs/resources/webhook
 Field	    Type	    Description
 id	        snowflake	the id of the webhook
 guild_id	snowflake?	the guild id this webhook is for
 channel_id	snowflake	the channel id this webhook is for
 user	    User?	    the user this webhook was created by (not returned when getting a webhook with its token)
 name	    ?string	    the default name of the webhook
 avatar	    ?string	    the default avatar of the webhook
 token	    string	    the secure token of the webhook
 ________________________________________________________________________
 https://discordapp.com/developers/docs/resources/webhook
 https://www.npmjs.com/package/discord-webhooks
 */
var xbladeUserJson =
{
    // "avatar": "b004ec1740a63ca06ae2e14c5cee11f3",
    "username": "Xblade",
    "discriminator": "4892",
    "id": "152450716709945345"
}

var i42Guild =
{
    guild_id: '157502648424202242',
    channels:
    {
        payments:
        {
            channel_id: '306096533827223552'
        }
    }
};

var tolGuild =
{
    guild_id: '261525739617255424',
    channels:
    {
        mod_chat: '303924561659822080'
    }
}

// var stripeWebhook =
// {
//     url: discordWebhookUrls.stripe,
//     channelId:
// };

// ...........................................................................................
// GET: Discord test
router.get('/webhook/', (req, res) =>
{
    discordTest(res);
    // res.json({status: "ONLINE"});
});

// ...........................................................................................
function getOptions(uri, json)
{
    var options =
    {
        uri: uri,
        method: 'POST',
        json: json
    }

    console.log('[Discord-Webhook] options==' + tolCommon.J(options));
    return options;
}

// ...........................................................................................
function handleWebhookErr(err, res, isTest)
{
    console.log('[Discord-Hook] err==' + err);

    var code = 500;
    if (err && err.statusCode)
        err.statusCode = err.statusCode;

    if (isTest)
        res.setStatus(code).send(err);
    else
        res.sendStatus(200); // We send back 200 no matter what
}

// ...........................................................................................
function handleWebhookSuccess(discordRes, res, isTest)
{
    console.log('[Discord-Hook] statusCode==' + discordRes.statusCode);

    if (isTest)
        res.send(res.statusCode);
    else
        res.sendStatus(200);
}

// ...........................................................................................
// Discord test
function discordTest(res)
{
    var stripeInfo = discordWebhookUrls.stripe;

    var uri = stripeInfo.url;
    var json =
    {
        "content": "blah blah content"      // [str] the message contents (up to 2000 characters)
        // "username":                      // [str] override the default username of the webhook
        // "avatar_avatar_url"              // [bool] override the default avatar of the webhoo
        // "tts": false,                    // [bool] true if this is a TTS message
        // "file": "someFileContents"       // [file contents] the contents of the file being sent
        // "embeds": []                     // [arr of embed obj] https://discordapp.com/developers/docs/resources/channel#embed-object
    };

    var options = getOptions(uri, json);

    request(options, (err, discordRes, body) =>
    {
        if (err)
            handleWebhookErr(err, res, true);

        // Success >>
        handleWebhookSuccess(discordRes, res, true);
    });

    // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    // Embeds Obj
    /*
    FIELD       TYPE                DESCRIPTION
    title	    string	            title of embed
    type	    string	            type of embed (always "rich" for webhook embeds)
    description	string	            description of embed
    url	        string	            url of embed
    timestamp	date	            timestamp of embed content
    color	    integer	            color code of the embed
    footer	    [embed footer obj]
    image	    [embed image obj]
    thumbnail	[embed thumbnail obj]
    video	    [embed video obj]
    provider	[embed provider obj]
    author	    [embed author obj]
    fields	    [arr of embed field objs]
     */
    // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    console.log("[Discord-Hook] Done");
}

// ...........................................................................................
// POST - Process charge, then show results
router.post('/webhook/stripe', (req, res) =>
{
    console.log( '[Webhook] params == ' + tolCommon.J(req.params) );
    console.log( '[Webhook] body == ' + tolCommon.J(req.body) );
    console.log('@ /discord/stripe POST (Webhook)');

    // Retrieve the request's body and parse it as JSON
    var event_json = JSON.parse(request.body);

    var stripeInfo = discordWebhookUrls.stripe;
    var uri = stripeInfo.url;
    var json =
    {
        "content": "blah blah content2"
    };

    var options = getOptions(uri, json);
    request(options, (err, discordRes, body) =>
    {
        if (err)
        handleWebhookErr(err, res);

        // Success >>
        handleWebhookSuccess(discordRes, res);
    });
});

module.exports = router;