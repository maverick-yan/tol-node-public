// ...........................................................................................
// routes/discord.js
const IS_BETA = true;
var fs = require('fs');
var cors = require('cors');
var express = require('express');
var request = require('request');
var winston = require('winston');
var Discord = require('discord.js');
var client = new Discord.Client();
// var rp = require('request-promise');
var router = express.Router();
var tolCommon = require('./scripts/tolCommon');
var tolMailer = require('./mailer');
var stripe = require('./stripe');

// ...........................................................................................
// Logs
winston.add(winston.transports.File, { filename: 'logs.log' });
// winston.remove(winston.transports.Console);
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
var discordBotSecrets = secretKeys.discordBot;
var unitySecret = secretKeys.unitySecret;

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
const DISCORD_DEBUG = false;
const ENABLE_BOT = true;
const CASUAL_IMG = 'https://i.imgur.com/4lSTVOg.png';
const AFTERMATH_IMG = 'https://i.imgur.com/bUGYFy4.png';
const KILLER_AVATAR_IMG = 'https://vignette2.wikia.nocookie.net/tol1879/images/d/d6/Killer-Type.png';
const LAUNCH_STEAM_URL = 'http://throneofli.es/play'; // steam://rungameid/595280';

var lfgDict = {};

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
        mod_chat: '303924561659822080',
        looking_for_game: '300527038983569409',
        lfg_announcements: '325103208580120597',
        admin_bot_testing: '261786804573700097'
    },
    roles:
    {
        lfg: '325185744668983297'
    }
}

// var stripeWebhook =
// {
//     url: discordWebhookUrls.stripe,
//     channelId:
// };


// ############################################################################################
// Discord callbacks >>
var rdy = false;

// ...........................................................................................
client.on('ready', () =>
{
    client.user.setGame('Throne of Lies').then(clientUser =>
    {
        rdy = true;
        winston.info('[d.js] Connected!');
    })
    .catch(err =>
    {
        winston.error('[d.js] Failed to set game: ' + err);
    });
});

// ...........................................................................................
client.on('disconnect', event =>
{
    rdy = false;
    if (event.code === 1000)
    {
        winston.warning('[d.js] Disconnected (gracefully)! event.code: ' + event.code);
        // Restart if disconnect code is 1000 (gracefully exited) because it won't reconnect automatically
        client.destroy().then(() => client.login(discordBotSecrets.token));
    }
    else
    {
        winston.error(`[d.js] Disconnected with WS error code ${event.code}, Logged!`);

        // Stop on other critical errors
        //process.exit(0);
    }
});

// ...........................................................................................
client.on('message', msg =>
{
    if (msg.content === '.ping')
    {
        if (!IS_BETA)
            msg.reply('Pong!');
        else
            msg.reply('[Test] Pong!');
    }
});

// ...........................................................................................
if (ENABLE_BOT)
    client.login(discordBotSecrets.token);

// ...........................................................................................
function getGuildById(id)
{
    var g = client.guilds.get(id);
    console.log('[Discord.js] GUILD ' + g.name + ' == ' + tolCommon.J(g));
    return g;
}
// ...........................................................................................
function getChannelById(guildId, channelId)
{
    var g = getGuildById(guildId);
    var c = g.channels.get(channelId);
    console.log(`[Discord.js] GUILD ${g.name} >> CHANNEL ${c.name}: ${tolCommon.J(c)}`);
    return c;
}

// ...........................................................................................
function getMyGuild()
{
    var g = client.guilds.get(tolGuild.guild_id);
    // console.log('[Discord.js] myGuild == ' + tolCommon.J(g));
    return g;
}

// ...........................................................................................
function getLFGAnnouncementsChannel()
{
    var c = getMyGuild().channels.get(tolGuild.channels.lfg_announcements);
    // console.log('[Discord.js] LFG Channel == ' + tolCommon.J(c));
    return c;
}

// ...........................................................................................
function getBotTestingChannel()
{
    var c = getMyGuild().channels.get(tolGuild.channels.admin_bot_testing);
    // console.log('[Discord.js] LFG Channel == ' + tolCommon.J(c));
    return c;
}

// ...........................................................................................
function getLFGChannel()
{
    var c = getMyGuild().channels.get(tolGuild.channels.looking_for_game);
    // console.log('[Discord.js] LFG Channel == ' + tolCommon.J(c));
    return c;
}

// ...........................................................................................
function checkBotOnline(res, forceFail)
{
    if (!ENABLE_BOT || !rdy || forceFail)
    {
        console.error('[d.js]**ERR: Discord is disabled/offline! Aborting.');
        var err = 'Discord is disabled/offline! Aborting.';
        returnFail(res, err);
    }
    else
        return true; // Online/ready!
}

// ...........................................................................................
// function createEmbed(color, title, field1, field2, field3, description, author, url, img, footer)
// {
//     const embed = new Discord.RichEmbed();
//
//     if (color)
//         embed.setColor('RED');
//     if (title)
//         embed.setTitle(title);
//     if (field1)
//         embed.addField(field1);
//     if (field2)
//         embed.addField(field2);
//     if (field3)
//         embed.addField(field3);
//     if (description)
//         embed.setDescription(description);
//     if (author)
//         embed.setAuthor(author);
//     if (url)
//         embed.setURL(url);
//     if (img)
//         embed.setImage(img);
//     if (footer)
//         embed.setFooter(footer);
//
//     // .setColor('RED')
//     // .setTitle(`>> Join ${playerName}: PLAY NOW <<`)
//     // .addField('Host:', 'someHostName', true)
//     // .addField('2:', '%2%', true)
//     // // .addField('3:', '%3%', true)
//     // // .setDescription('%USER% has created a new game!')
//     // .setAuthor(`${curPlayers}/${maxPlayers} Players (Min: ${minPlayers})`, KILLER_AVATAR_IMG)
//     // .setURL(LAUNCH_STEAM_URL)
//     // .setImage(img)
//     // .setFooter('^ Link directly launches the game');
// }

// ...........................................................................................
function createLFGEmbed(playerName, curPlayers, maxPlayers, minPlayers, img, startedGame)
{
    console.log(`[d.js] @ createLFGEmbed: playerName:${playername} // curPlayers:${curPlayers} // 
    maxPlayers:${maxPlayers} // minPlayers:${minPlayers} // startedGame:${startedGame}`);

    // Get color
    var color = 'RED';
    if (curPlayers <= 0)
        color = 'DARK_PURPLE';
    else if (curPlayers > 1 && curPlayers < minPlayers)
        color = '#FFFF00'; // Yellow
    else if (curPlayers >= minPlayers && curPlayers < maxPlayers)
        color = 'GREEN';
    else if (curPlayers >= maxPlayers)
        color = 'AQUA';

    console.log('[d.js] color == ' + color);

    // Set main embed
    const embed = new Discord.RichEmbed()
        .setColor(color)
        .setTitle(`>> CLICK to Join ${playerName}: Play Now <<`)
        // .addField('Host:', 'someHostName', true)
        // .addField('2:', '%2%', true)
        // .addField('3:', '%3%', true)
        // .setDescription('%USER% has created a new game!')
        .setAuthor(`${curPlayers}/${maxPlayers} Players (Min: ${minPlayers})`, KILLER_AVATAR_IMG)
        .setURL(LAUNCH_STEAM_URL)
        .setImage(img)
        .setFooter('^ Link directly launches the game');

    // Dynamic embeds here
    if (curPlayers >= minPlayers && !startedGame)
        embed.addField('READY', '\u200B', true); // \u200B == blank
    else if (startedGame)
    {
        embed
            .addField('STARTED', '\u200B', true) // \u200B == blank
            .setTimestamp(timestamp);
    }

    return embed;
}

// ############################################################################################
// Routes >>
// ...........................................................................................
// GET: Discord test
router.get('/test', (req, res) =>
{
    res.json({status: "ONLINE"});
});

// ...........................................................................................
// POST: Live webhook handling
router.post('/announcelfg', (req, res) =>
{
    console.log('[d.js] @ /announcelfg');

    // Body
    var secret = req.body.unitySecret;
    var minPlayers = req.body.minPlayers;
    var maxPlayers = req.body.maxPlayers;
    var curPlayers = req.body.curPlayers;
    var gameMode = req.body.gameMode;
    var playerName = req.body.playerName;
    var roomName = req.body.roomName;
    var startedGame = req.body.startedGame;
    // var masterClientName = req.body.masterClientName;

    // Validate
    console.log('[d.js] Validating announcelfg...');
    if (!checkBotOnline(res))
    {
        returnFail(res, '[d.js] BOT offline');
        return;
    }
    if (secret !== unitySecret)
    {
        returnFail(res, '[d.js] Invalid Secret');
        return;
    }

    // Get channel
    //var c = getLFGChannel();
    var c = getBotTestingChannel();

    // Get game mode img
    var img = CASUAL_IMG;
    if (gameMode === "Aftermath")
        img = AFTERMATH_IMG;

    // Create an new embed with current info
    var embed = createLFGEmbed(playerName, curPlayers, maxPlayers, minPlayers, img, startedGame);
    console.log('[d.js] New RichEmbed created! embed.title == ' + embed.title);

    // If a previous room was found, EDIT instead of make a new one
    var msgId = lfgDict[roomName];
    if (!msgId)
    {
        // Ensure there isn't 0 people in room
        if (curPlayers <= 0)
        {
            returnSuccess(res);
            return;
        }

        // New room -- CREATE post : Setup embed dynamically >>
        console.log('[d.js] BOT Online - NO msg id: Create NEW embed');
        sendEmbed(c, embed, roomName, res);
    }
    else
    {
        // EXISTING room -- FETCH old embed post : Edit info >>
        console.log('[d.js] BOT Online - FOUND msg id: Edit EXISTING embed');
        try
        {
            // https://discord.js.org/#/docs/main/master/class/TextChannel?scrollTo=fetchMessage
            c.fetchMessage(msgId).then(message =>
            {
                // Get the last embed >> Edit
                myOldEmbed = message.embeds[0];
                console.log('[d.js] Successfully retrieved old embed! myOldEmbed.title == ' + myOldEmbed.title);

                return message.edit({ embed });
            })
            .then(message =>
            {
                // 0 players?
                if (curPlayers <= 0)
                {
                    // 0 Players
                    console.log('[d.js] curPlayers is 0!');
                    if (message.deletable)
                    {
                        // Deletable
                        console.log('[d.js] DELETING message in 10s. Returning success now.');
                        returnSuccess(res);
                        message.delete(1000*10).then(message =>
                        {
                            console.log('[d.js]**Message deleted');
                        }); // del 10s later
                    }
                    else
                    {
                        // Not deletable
                        console.error('[d.js]**WARN: Players are 0 and couldnnt delete last msg. Doing nothing!');
                        returnSuccess(res);
                    }
                }
                else
                {
                    // > 0 players
                    console.log('[d.js] Successful resend (or delete): ' + message);
                    returnSuccess(res);
                }
            })
            .catch(err =>
            {
               console.error('[d.js] ERR @ announcelfg.resend: ' + err);
               if (err == 'DiscordAPIError: Unknown Message') // Message deleted
               {
                   // Make a new one, instead
                   console.log('[d.js] WARN @ announcelfg.resend: Couldnt edit (deleted?), Making NEW embed');
                   sendEmbed(c, embed, roomName, res);
               }
               else
                   returnFail(res, err);
            });
        }
        catch(e)
        {
            console.log("[d.js]**ERR: FAILED to get last embed: Aborting. CREATING one, after all:");

            // Ensure there's not 0
            if (curPlayers <= 0)
            {
                if (message.deletable)
                {
                    console.log('[d.js]**Attempting to delete message...');
                    message.delete(1000*10).then(message =>
                    {
                        console.log('[d.js]**Message deleted');
                        returnSuccess(res);
                    });
                }
            }
            else
            {
                // Send now >> probably err because bot was offline. Don't edit, make anew >>
                embed = createLFGEmbed(playerName, curPlayers, maxPlayers, minPlayers, img);
                sendEmbed(c, embed, roomName, res);
            }
        }
    }
});

// .............................................................................
function sendEmbed(channel, embed, roomName, res)
{
    console.log('[d.js] @ sendEmbed. embed == ' + embed);

    // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    // Validate
    var errMsg = "";
    if (!channel)
    {
        returnFail(res, '[d.js] Invalid channel');
        return;
    }
    if (!embed)
    {
        returnFail(res, '[d.js] Invalid embed');
        return;
    }
    if (!roomName)
    {
        returnFail(res, '[d.js] Invalid roomName');
        return;
    }
    if (!res)
    {
        returnFail(res, '[d.js] Invalid res');
        return;
    }
    // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

    console.log('[d.js] (Re)Sending embed...');
    channel.send({ embed }).then(message =>
    {
        // Success >>
        // https://discord.js.org/#/docs/main/master/class/MessageEmbed?scrollTo=createdAt
        console.log('[d.js] Successful embed msg! message.embeds[0] == ' + message.embeds[0]);
        console.log('[d.js] message.embeds[0].title == ' + message.embeds[0].title);
        var id = message.id;
        console.log('[d.js] message.id == ' + id);

        // Add to dictionary
        lfgDict[roomName] = id;

        returnSuccess(res);
    })
    .catch(err =>
    {
        // ERR >>
        console.error('[d.js] Err attempting to send embed: ' + err);
        returnFail(res, err);
    });
}

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
    client.disconnect();
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
var returnFalse = true; // Test
router.get('/guild/online', (req, res) =>
{
    console.log('[d.js] @ "/guild/online". Checking if online...');

    var forceFailForTesting = false;
    if (!checkBotOnline(res, forceFailForTesting))
        return;

    console.log('[d.js] Online and ready for "/guild/status"!');
    var g = getMyGuild();
    var onlineMembers = g.members.filter(m => m.presence.status === 'online').size;

    returnSuccess(res);

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

// ############################################################################################
// funcs >>
// ...........................................................................................
function returnSuccess(res)
{
    var data = {
        success: true
    };

    res.json(data);
}

// ...........................................................................................
function returnFail(res, error)
{
    // Validate
    if (!error)
        error = { err: 'Unknown Error' };
    else
        error = { err: error};

    res.status(500).send(error);
}

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
// TODO
function sendExternalWebhook()
{
    if (DISCORD_DEBUG) console.log('[Discord-Hook] @ sendGeneralWebhook()');

    // var uri =
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