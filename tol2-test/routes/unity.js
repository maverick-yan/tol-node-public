// ...........................................................................................
// routes/unity.js
const IS_BETA = true;
var fs = require('fs');
var cors = require('cors');
var express = require('express');
var request = require('request');
var winston = require('winston');
// var Discord = require('discord.js');
var router = express.Router();
var tolCommon = require('./scripts/tolCommon');
// var tolMailer = require('./mailer');

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
var unityKeys = secretKeys.unity;
var apiKey = unityKeys.apikey;
var orgId = unityKeys.orgid;
var projectid = unityKeys.projectid;
var buildTargetId = unityKeys.buildtargetid;

// ############################################################################################
// Unity setup >>
// https://build-api.cloud.unity3d.com/docs/1.0.0/index.html
/*
SAMPLE HOOK:
>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
Content-Length: 873
X-Unitycloudbuild-Event: ProjectBuildQueued
X-Unitycloudbuild-Hookid: 7
X-Unitycloudbuild-Deliveryid: 81a4ab67-0176-4e4c-8ab2-bd0ab7d3cc70
Connection: Keep-Alive
Content-Type: application/json
{
    "projectName": "My Project",
    "buildTargetName": "Mac desktop 32-bit build",
    "projectGuid": "0895432b-43a2-4fd3-85f0-822d8fb607ba",
    "orgForeignKey": "13260",
    "buildNumber": 14,
    "buildStatus": "queued",
    "startedBy": "Build User <builduser@domain.com>",
    "platform": "standaloneosxintel",
    "links": {
        "api_self": {
            "method": "get",
            "href": "/api/orgs/my-org/projects/my-project/buildtargets/mac-desktop-32-bit-build/builds/14"
        },
        "dashboard_url": {
            "method": "get",
            "href": "https://build.cloud.unity3d.com"
        },
        "dashboard_project": {
            "method": "get",
            "href": "/build/orgs/stephenp/projects/assetbundle-demo-1"
        },
        "dashboard_summary": {
            "method": "get",
            "href": "/build/orgs/my-org/projects/my-project/buildtargets/mac-desktop-32-bit-build/builds/14/summary"
        },
        "dashboard_log": {
            "method": "get",
            "href": "/build/orgs/my-org/projects/my-project/buildtargets/mac-desktop-32-bit-build/builds/14/log"
        }
    }
}
>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
 */
const UNITY_DEBUG = false;
const SUCCESS_EVENT = "ProjectBuildSuccess";
var base_url = `https://build-api.cloud.unity3d.com/api/v1/orgs/${orgId}`; // https://build-api.cloud.unity3d.com/api/v1/orgs/{orgid}/hooks



// ...........................................................................................
// module.exports = router;
module.exports =
{
    myRouter: router,
    discordSendStripeHook: sendStripeHook
};