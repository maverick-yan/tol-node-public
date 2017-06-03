// ...........................................................................................
// routes/steam.js
var IS_BETA = false;
var fs = require('fs');
var cors = require('cors');
var express = require('express');
var request = require('request');
var SteamApi = require('steam-api');
var router = express.Router();
var tolCommon = require('./scripts/tolCommon');
//var tolMailer = require('./mailer');

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
var steamApiKey = secretKeys.steam.webApiKey;
var steamAppId = secretKeys.steam.appId;

// ############################################################################################
/*
 Steam setup >>
 https://github.com/DPr00f/steam-api-node
 */
var STEAM_DEBUG = false;
var optionalSteamId = "";

var user = new SteamApi.User(steamApiKey, optionalSteamId);
var userStats = new SteamApi.UserStats(steamApiKey, optionalSteamId);
var news = new SteamApi.News(steamApiKey);
var app = new SteamApi.App(steamApiKey);
var player = new SteamApi.Player(steamApiKey, optionalSteamId);
var inventory = new SteamApi.Inventory(steamApiKey, optionalSteamId);
var items = new SteamApi.Items(steamApiKey, optionalSteamId);

// ############################################################################################
// Steam API Backpack
items.GetPlayerItems(steamAppId, optionalSteamId).done((result) =>
{
    console.log(result);
});


// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// Inventory
inventory.GetAppItems(steamAppId, optionalSteamId).done((result) =>
{
    console.log(result);
});


// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// User methods
user.GetPlayerBans(optionalSteamId).done((result) =>
{
    console.log(result);
});

user.GetFriendList(optionalRelationship = 'all', optionalSteamId).done((result) =>
{
    console.log(result);
});

user.GetUserGroupList(optionalSteamId).done((result) =>
{
    console.log(result);
});

//// e.g. vanityUrl = "pr00fgames";
user.ResolveVanityUrl(vanityUrl).done((result) =>
{
    console.log(result);
});


// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// UserStats methods
//// e.g. appId = 17740;
//// e.g. statsName = ['global.map.emp_isle'];
var statsName = [''];
userStats.GetGlobalStatsForGame(steamAppId, statsName).done((result) =>
{
    console.log(result);
});

// ...........................................................................................
//// e.g. appId = 620;
userStats.GetNumberOfCurrentPlayers(steamAppId).done((result) =>
{
    console.log(result);
});

// ...........................................................................................
userStats.GetSchemaForGame(steamAppId).done((result) =>
{
    console.log(result);
});

// ...........................................................................................
userStats.GetPlayerAchievements(steamAppId, optionalSteamId).done((result) =>
{
    console.log(result);
});

// ...........................................................................................
userStats.GetGlobalAchievementPercentagesForApp(steamAppId).done((result) =>
{
    console.log(result);
});

// ...........................................................................................
userStats.GetUserStatsForGame(steamAppId, optionalSteamId).done((result) =>
{
    console.log(result);
});


// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// News Methods
news.GetNewsForApp(
    steamAppId,
    optionalCount = 5,
    optionalMaxLength = null)
.done((result) =>
{
        console.log(result);
});


// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// App Methods
app.appDetails(steamAppId).done((result) =>
{
    console.log(result);
});

// ...........................................................................................
app.GetAppList().done((result) =>
{
    console.log(result);
});

// ...........................................................................................
var addressOrIp = "";
app.GetServersAtAddress(addressOrIp).done((result) =>
{
    console.log(result);
});

// ...........................................................................................
var ver = "v0.8.0";
app.UpToDateCheck(steamAppId, version).done((result) =>
{
    console.log(result);
});


// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// Player Methods
player.GetSteamLevel(optionalSteamId).done((result) =>
{
    console.log(result);
});

// ...........................................................................................
player.GetPlayerLevelDetails(optionalSteamId).done((result) =>
{
    console.log(result);
});

// ...........................................................................................
player.GetBadges(optionalSteamId).done((result) =>
{
    console.log(result);
});

// ...........................................................................................
var optionalBadgeId = "";
player.GetCommunityBadgeProgress(optionalBadgeId, optionalSteamId).done((result) =>
{
    console.log(result);
});

// ...........................................................................................
player.GetOwnedGames(
    optionalSteamId,
    optionalIncludeAppInfo = true,
    optionalIncludePlayedFreeGames = false,
    optionalAppIdsFilter = []
).done(function(result)
{
    console.log(result);
});

// ############################################################################################
// Routes >>
// ...........................................................................................
// GET: Discord test
router.get('/webhook/', (req, res) =>
{
    //discordTest(res);
    stripe.stripeTest();
    res.json({status: "ONLINE"});
});

// .............................................................................
// GET: Guild general info
router.get('/guild', (req, res) =>
{
    if (!checkBotOnline(res))
        return;

    var g = getMyGuild();
    var json = {
        Guild: g
    };
    res.json(json);
});

// .............................................................................
// GET: count/guild
router.get('/guild/count', (req, res) =>
{
        console.log('[d.js] @ "/guild/online". Checking if online...');
    if (!checkBotOnline(res))
        return;

    var count = getMyGuild().memberCount;
    console.log('Guild Member Count: ' + count);
    var json = {
        memberCount: count
    };
    res.json(json);
});

// .............................................................................
// GET: Guild LFG channel info
router.get('/guild/channel/lfg', (req, res) =>
{
    if (!checkBotOnline(res))
        return;

    var c = getLFGChannel();

    var json = {
        GuildChannel: c,
    };
    res.json(json);
});

// .............................................................................
// GET: Guild online count
router.get('/guild/online', (req, res) =>
{
    console.log('[d.js] @ "/guild/online". Checking if online...');

    if (!checkBotOnline(res))
        return;

    console.log('[d.js] Online and ready for "/guild/status"!');
    var g = getMyGuild();
    var onlineMembers = g.members.filter(m => m.presence.status === 'online').size;

    var data = {
        onlineCount: onlineMembers
    };
    res.json(data);

    console.log('[d.js] Done. onlineMembers==' + onlineMembers);
});

// .............................................................................
// GET: Any channel
//router.get('/count/channel/:ch', (req, res) =>
//{
//    var cName = req.params.ch;
//    var c = getChannelById(c
//    console.log('[d.js] LFG Channel Count: ' + count);
//    var json = {
//        channelCount: count
//    };
//    res.json(json);
//});

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
    // if (DISCORD_DEBUG) console.log('[Discord-Hook] @ sendStripeHook(): balance==' + tolCommon.J(balance));

    var stripeInfo = discordWebhookUrls.stripe;
    var uri = stripeInfo.url;

    // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    // Prepare content
    if (DISCORD_DEBUG)
    {
        console.log('[Discord-Hook] @ sendStripeHook: Preparing txt...');
        // console.log('[Discord-Hook] balance.pending.amount==' + balance.pending[0].amount);
        // console.log('[Discord-Hook] balance.available.amount==' + balance.available[0].amount);
        console.log('[Discord-Hook] chargeResult.amount==' + chargeResult.amount);
        console.log('[Discord-Hook] chargeResult.metadata.src==' + chargeResult.metadata.src);
        console.log('[Discord-Hook] chargeResult.metadata.ref==' + chargeResult.metadata.ref);
    }

    // var amtPending = balance.pending[0].amount;
    // var amtAvail = balance.available[0].amount;
    var txt =
    {
        // balancePendingHuman: (amtPending != 0) // 999 => 9.99
        // ? amtPending * .01
        // : 0,
        //
        // balanceAvailHuman: (amtAvail != 0)
        // ? amtAvail* .01
        // : 0,
        //
        amtHuman: chargeResult.amount * .01,
        src: chargeResult.metadata.src,
        ref: chargeResult.metadata.ref
    }

    console.log('[Discord-Hook] Content==' + tolCommon.J(txt));

    var refBy = '';
    if (txt.ref)
        refBy = '\n>> `Referred by: ' + txt.ref + '`';

    var txtContent = "";
    if (IS_BETA)
        txtContent = `**[MOCK] $${txt.amtHuman} Sale** (from ${txt.src})!${refBy}`; // Add "[MOCK] "
    else
        txtContent = `**$${txt.amtHuman} Sale** (from ${txt.src})!${refBy}`;
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