// ...........................................................................................
// routes/discord.js
var IS_BETA = true;
var fs = require('fs');
var cors = require('cors');
var express = require('express');
var request = require('request');
// var rp = require('request-promise');
var router = express.Router();
var tolCommon = require('./scripts/tolCommon');
var tolMailer = require('./mailer');
var stripe = require('./stripe');

// ...........................................................................................
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

// ...........................................................................................
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
var DISCORD_DEBUG = false;

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

// ############################################################################################
// routes >>
// ...........................................................................................
// GET: Discord test
router.get('/webhook/', (req, res) =>
{
    //discordTest(res);
    stripe.stripeTest();
    res.json({status: "ONLINE"});
});

// ...........................................................................................
// POST - Process charge, then show results
// router.post('/webhook/stripe', (req, res) =>
// {
//     console.log('[DISCORD] @ /webhook/stripe POST');
//     console.log('[Webhook] params == ' + tolCommon.J(req.params));
//     console.log('[Webhook] body == ' + tolCommon.J(req.body));
//
//     // Retrieve the request's body and parse it as JSON
//     // var event_json = JSON.parse(req.body);
//     console.log('[Discord-Hook] Verifying Stripe token...');
//
//     var results = {};
//
//     // 1 - Verify Stripe event
//     stripe.stripeVerifyEvent(req.body)
//     .then((verifyResult) =>
//     // 2 - Verified the result
//     {
//         console.log('[Discord-Hook] verifyResult==' + verifyResult);
//         results.verify = verifyResult;
//
//         if (!verifyResult)
//             return Promise.reject("Unverified - Aborting!");
//
//         // return sendStripeHook(verifyResult);
//         return stripeGetBalance();
//     }).then((balance) =>
//     // 3 - Got balance
//     {
//         console.log('[Discord-Hook] "POST() webhook/stripe" balance==' + balance);
//         results.balance = balance;
//         return sendStripeHook(verifyResult, balance);
//     }).then((err, discordRes, body) =>
//     {
//         // 4 - Sent Discord webhook
//         if (err)
//         {
//             handleWebhookErr(err, res);
//             return Promise.reject("Unverified - Aborting!");
//         }
//
//         // 5 - Return status
//         console.log('[Discord-Hook] Completed!');
//         res.sendStatus(200);
//     }).catch((err) =>
//     {
//         console.log("ERR: " + err);
//         res.sendStatus(201); // We still send 200 since it's a webhook. 201 to show weirdness.
//         // stripeMockSuccess(res);
//     });
// });

// ############################################################################################
// funcs >>
// ...........................................................................................
function getOptions(uri, json)
{
    var options =
    {
        uri: uri,
        method: 'POST',
        json: json
    }

    if (DISCORD_DEBUG) console.log('[Discord-Webhook] options==' + tolCommon.J(options));
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
        res.status(code).send(err);
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
        handleWebhookSuccess(discordRes, res);
    });

    // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    // Embeds Obj
    /*
     FIELD          TYPE                DESCRIPTION
     title	        string	            title of embed
     type	        string	            type of embed (always "rich" for webhook embeds)
     description	string	            description of embed
     url	        string	            url of embed
     timestamp	    date	            timestamp of embed content
     color	        integer	            color code of the embed
     footer	        [embed footer obj]
     image	        [embed image obj]
     thumbnail	    [embed thumbnail obj]
     video	        [embed video obj]
     provider	    [embed provider obj]
     author	        [embed author obj]
     fields	        [arr of embed field objs]
     */
    // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    console.log("[Discord-Hook] Done");
}

// ...........................................................................................
// res = send 200
// no res = return promise
function sendStripeHook(chargeResult, balance)
{
    if (DISCORD_DEBUG) console.log('[Discord-Hook] @ sendStripeHook(): chargeResult==' + tolCommon.J(chargeResult));
    if (DISCORD_DEBUG) console.log('[Discord-Hook] @ sendStripeHook(): balance==' + tolCommon.J(chargeResult));

    var stripeInfo = discordWebhookUrls.stripe;
    var uri = stripeInfo.url;

    // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    // Prepare content
    if (DISCORD_DEBUG)
    {
        console.log('[Discord-Hook] @ sendStripeHook: Preparing txt...');
        console.log('[Discord-Hook] balance.pending.amount==' + balance.pending[0].amount);
        console.log('[Discord-Hook] balance.available.amount==' + balance.available[0].amount);
        console.log('[Discord-Hook] chargeResult.amount==' + chargeResult.amount);
        console.log('[Discord-Hook] chargeResult.metadata.src==' + chargeResult.metadata.src);
        console.log('[Discord-Hook] chargeResult.metadata.ref==' + chargeResult.metadata.ref);
    }

    var amtPending = balance.pending[0].amount;
    var amtAvail = balance.available[0].amount;
    var txt =
    {
        balancePendingHuman: (amtPending != 0) // 999 => 9.99
        ? amtPending * .01
        : 0,

        balanceAvailHuman: (amtAvail != 0)
        ? amtAvail* .01
        : 0,

        amtHuman: chargeResult.amount * .01,
        src: chargeResult.metadata.src,
        ref: chargeResult.metadata.ref
    }

    console.log('[Discord-Hook] Content==' + tolCommon.J(txt));

    var refBy = txt.ref !== null
        ? ' Referred by ' + txt.ref
        : ''

    var txtContent = "";
    if (IS_BETA)
        txtContent = `**[MOCK] $${txt.amtHuman} Sale** (from ${txt.src})!${refBy}\n>> Pending/Available Balance: \`$${txt.balancePendingHuman}\` / \`$${txt.balanceAvailHuman}\``;
    else
        txtContent = `**$${txt.amtHuman} Sale** (from ${txt.src})!${refBy}\n>> Pending/Available Balance: \`$${txt.balancePendingHuman}\` / \`$${txt.balanceAvailHuman}\``;
    // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

    var json = { "content": txtContent };

    // Send webhook to Discord
    var options = getOptions(uri, json);

    // Send request() **DONT USE .THEN()** => Promise
    console.log('[Discord-Hook] Sending request() NOW...');
    request(options, (err, webhookRes, body) =>
    {
        if (err)
        {
            console.error('[Discord-Hook] err @ sendStripeHook.request()');
            return Promise.reject(err);
        }

        console.log('[Discord-Hook] Success: ' + webhookRes.statusCode);
        return Promise.resolve(webhookRes.statusCode);
    }).catch((err) =>
    {
        console.error('[Discord-Hook] Caught ERR: ' + J(err));
        return Promise.reject(err);
    });
}

// ...........................................................................................
// function stripeMockSuccess(res)
// {
//     console.log('[Discord-Hook] @ stripeMockSuccess');
//
//     stripe.stripeGetBalance()
//     .then((balance) =>
//     {
//         console.log('[Discord-Hook] stripeMockSuccess() balance==' + balance);
//         stripeMockResult(balance, res);
//     }).catch((err) =>
//     {
//         console.log("[Discord-Hook] stripeMockSuccess ERR: " + err);
//         res.sendStatus(201); // We still send 200 since it's a webhook. 201 to show weirdness.
//     });
// }

// ...........................................................................................
// function stripeMockResult(balance, res)
// {
//     console.log('[Discord-Hook] @ stripeMockResult');
//
//     var mockResult =
//     {
//         data:
//         {
//             object:
//             {
//                 amount: 999,
//                 metadata:
//                 {
//                     src: 'throneoflies.com (TEST)',
//                     ref: 'xblade'
//                 }
//             }
//         }
//     };
//
//     return sendStripeHook(mockResult, balance, res);
// }

// ...........................................................................................
// module.exports = router;
module.exports =
{
    myRouter: router,
    discordSendStripeHook: sendStripeHook
};