// ...........................................................................................
// routes/stripe.js
const IS_BETA = true;
var fs = require('fs');
var cors = require('cors');
var express = require('express');
var mongodb = require('mongodb');
var router = express.Router();
var tolCommon = require('./scripts/tolCommon');
var tolMailer = require('./mailer');
var discord = require('./discord');

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
var testSecret = secretKeys.stripeTestSecret;
var liveSecret = secretKeys.stripeLiveSecret;

var mongoSecrets = secretKeys.mongo;
var mongoSecretURI = mongoSecrets.uri;

var adminEmail = secretKeys.adminEmails[0];
var supportEmail = secretKeys.supportEmail;
var affiliates = secretKeys.affiliates;

// ...........................................................................................
// Stripe setup
// https://github.com/stripe/stripe-node
var STRIPE_DEBUG = true; // Extra logs
var selectedSecret = (IS_BETA ? testSecret : liveSecret);
var stripe = require('stripe')(selectedSecret);
stripe.setTimeout(20000); // in ms (this is 20 seconds)

// Mongo
var KEYS_AVAIL_KEY = "keysAvail";
if (IS_BETA)
    KEYS_AVAIL_KEY = "keysAvailTest";

// Stripe inventory
var products =
[
    {
        shortName: 'game',
        productName: 'Throne of Lies (Game)',
        productDescription: 'Steam Key with Alpha+ Access',
        productNoun: 'game key',
        productPriceHuman: 9.99,
        productPrice: 999,
        productImg: 'https://i.imgur.com/cH9OjNC.jpg'
    }
];

// ...........................................................................................
// GET - Test (root)
router.get('/', cors(corsOptions), (req, res, next) =>
{
    res.jsonp({ status: 'ONLINE' });
});

// ...........................................................................................
// GET - Test display product receipt
router.get('/charge/test', cors(corsOptions), (req, res) =>
{
  var product = products[0];
  var qty = 1;
  var email = 'blah@blah.com';

  var isMock = true;
  renderReceipt(product, qty, email, res, isMock); // (product, qty, email, res, isMockRun)
});

// ...........................................................................................
// GET - Test display product receipt ERROR
router.get('/charge/testErr', cors(corsOptions), (req, res) =>
{
    //var product = products[0];
    //var qty = 1;
    //var email = 'blah@blah.com';

    var err =
    {
        type: 'StripeCardError',
        message: 'This is a test error'
    };

    var isMock = true;
    renderReceiptErr(err, res, isMock);
});

// ...........................................................................................
// GET - Test display product receipt ERROR
// router.get('/testbalance', cors(corsOptions), function(req, res)
// {
//     getBalance().then(balance =>
//     {
//         console.log('success: ' + tolCommon.J(balance))
//
//         console.error('[STRIPE-RESULT] success @ /testbalance');
//         res.send(balance);
//     })
//     .catch(err =>
//     {
//         console.log('err: ' + tolCommon.J(err))
//         console.error('[STRIPE-RESULT] Err result @ /testbalance');
//         res.status(500).send(err);
//     });
// });

// ...........................................................................................
function renderReceiptErr(err, res, isMockRun)
{
    console.error('[STRIPE-RESULT] Err @ renderReceiptErr()');

    var isBank = detectIfErrIsBankProblem(err);

    res.status(500).render('receiptErr',
    {
        title: 'UNSUCCESSFUL Purchase | Throne of Lies (Imperium42)',
        //email: email,
        errMsg: err.message || err,
        isBankIssue: isBank,
        isMock: (IS_BETA || isMockRun)
    });
}

// ...........................................................................................
function renderReceipt(product, qty, email, res, isMockRun)
{
    console.error('[STRIPE-RESULT] success @ renderReceipt()');

    res.render('receipt',
    {
        title: 'Successful Purchase | Throne of Lies (Imperium42)',
        itemImg: product.productImg,
        itemName: product.productName,
        itemDescr: product.productDescription,
        itemNoun: product.productNoun,
        price: product.productPriceHuman,
        qty: qty,
        email: email,
        isMock: (IS_BETA || isMockRun)
    });
}

// ...........................................................................................
// GET - IP tester
router.get('/iptest', (req, res) =>
{
    var ip2 = tolCommon.getIP(req);
    res.send(ip2);
});

// ...........................................................................................
// POST - Process charge, then show results
router.post('/charge/:name', cors(corsOptions), (req, res) =>
{
    console.log( '[Stripe] params == ' + tolCommon.J(req.params) );
    console.log( '[Stripe] body == ' + tolCommon.J(req.body) );

    var productName = req.params.name; 			            // "game"
    var stripeToken = req.body.stripeToken; 		        // <nonce>
    var stripeTokenType = req.body.stripeTokenType; 	    // "card"
    var ip = req.body.client_ip || tolCommon.getIP(req);    // 0.0.0.0
    var email = req.body.stripeEmail;			            // "you@you.com" (pre-validated)
    var ref = req.body.ref;				                    // "xblade"
    var src = req.body.src;				                    // "throneoflies.com"

    console.log(`@ /charge/${productName} GET`);
    var product = getProduct(productName);

    // Validate product
    if (!product)
    {
        console.error('[STRIPE-RESULT] Err result @ /testbalance');
        return res.status(500).send('Product does not exist.');
    }

    // Success >>
    var amt = product.productPrice;
    var qty = 1;
    var result = chargeCust(res, product, email, stripeToken, amt, qty, ref, src, ip);
});

// ...........................................................................................
function getProduct(productName)
{
  for (var i = 0; i < products.length; i++)
  {
    if(productName === products[i].shortName)
      return products[i];
    else
      return null;
  }
}

// ...........................................................................................
// Verifies webhooks, for example
// **NOTE: THEIR DOCS ARE WRONG! It actually returns (balance, err) for whatever reason.
// (Keep an eye on this - it may change)
function getBalance(res)
{
    console.log('[Stripe] @ getBalance');

    return stripe.balance.retrieve()
    .then((balance, err) =>
    {
        if (err)
            return Promise.reject(err);
        else
        {
            console.log('[Stripe] Successful getBalance() => balance==' + balance);
            if (res)
            {
                console.error('[STRIPE-RESULT] success @ getBalance()');
                res.send(balance);
            }
            return Promise.resolve(balance);
        }
    })
    .catch(err =>
    {
        console.log('[STRIPE-ERR] getBalance ERR: ' + tolCommon.J(err));
        if (res && !res.headersSent)
        {
            // End here
            console.error('[STRIPE-RESULT] Err caught @ getBalance()');
            res.status(500).send(err);
            return;
        }

        // Reject and continue
        return Promise.reject(err);
    });
}

// ...........................................................................................
// Verifies webhooks, for example
function verifyEvent(event_json, callback)
{
    console.log("[STRIPE] @ verifyEvent");
    // Retrieve the request's body and parse it as JSON
    // var event_json = JSON.parse(request.body);

    // Verify the event by fetching it from Stripe
    console.log("[STRIPE] Verifying event...");
    return stripe.events.retrieve(event_json.id)
    .then((err, event) =>
    {
        console.log("[STRIPE] Event verified==" + (err ? false : true));
        if (err)
        {
            // Fail >>
            console.log("[STRIPE] verifyEvent ERR: " + tolCommon.J(err));
            resolve(false);
            // resolve(event);
        }
        else
        {
            // Success >>
            console.log("[STRIPE] verifyEvent success: " + event);
            resolve(event);
        }
    })
    .catch(err =>
    {
        console.log("[STRIPE-ERR] ERR @ verifying event: " + tolCommon.J(err));
        if (callback)
            return false;
        else
            return Promise.reject(err);
    });
}

// ...........................................................................................
// Create a customer
//function createCust(custEmail)
//{
//  console.log('@ createCust: ' + custEmail);
//
//  stripe.customers.create(
//    { email: custEmail },
//    function(err, customer)
//    {
//      if (err)
//      {
//        // null if no error occurred
//        console.log('Failed to make customer: ' + err);
//        return err;
//      }
//
//      // SUCCESS >>
//      console.log('Successfully made customer: ' + tolCommon.J(customer));
//      return customer;
//    }
//  );
//}

// ...........................................................................................
// router.get('/dbtest', (req, res) =>
// {
//     console.log('@ GET /dbtest');
//
//     getDelSteamKey().then(steamKey =>
//     {
//         // console.log('keyIndex==' + steamKey);
//         res.send(steamKey || "nada");
//     })
//     .catch(err =>
//     {
//         res.status(500).send(err);
//     })
// });

// ...........................................................................................
function getDelSteamKey()
{
    console.log('@ getDelSteamKey');

    return new Promise ((resolve, reject) =>
    {
        // Standard URI format: mongodb://[dbuser:dbpassword@]host:port/dbname
        mongodb.MongoClient.connect(mongoSecretURI, (err, db) =>
        {
            if (err)
                return reject(err);

            console.log('[Stripe] @ getDelSteamKey (db): Connected');

            var keys = db.collection('keyscollection');

            var findStripeKey = { '_id': 'stripe' };
            keys.find(findStripeKey).toArray((error, docs) =>
            {
                if (error)
                    return reject(error);

                // Get next Steam key from the top of the arr
                var steamKey = docs[0][KEYS_AVAIL_KEY][0];
                console.log('[Stripe] db: getDelSteamKey() steamKey==' + steamKey);

                // Delete it immediately from db -- just in case multiple connections. We'll add it back, if failed.
                if (STRIPE_DEBUG) console.log(`[Stripe] db: Deleting steamKey (${steamKey}) from db...`);
                keys.update(findStripeKey,
                {
                    $pull: {
                        [KEYS_AVAIL_KEY]: steamKey
                    }
                }, (pullErr, pullRes) =>
                {
                    db.close();
                    if (pullErr)
                        return reject(error);

                    console.log('[Stripe] db: Deleted key successfully: ' + pullRes);
                    if (steamKey)
                        return resolve(steamKey)
                    else
                        return reject(`Steam Keys out of stock! Let a dev know before trying again.`);
                });
            });
        });
    });
}

// ...........................................................................................
function addSteamKey(steamKey)
{
    console.log('@ addSteamKey');

    return new Promise ((resolve, reject) =>
    {
        // Standard URI format: mongodb://[dbuser:dbpassword@]host:port/dbname
        mongodb.MongoClient.connect(mongoSecretURI, (err, db) =>
        {
            if (err)
                return reject(err);

            console.log('[Stripe] @ addSteamKey: Connected');

            // Get keyscollection "collection"
            var keys = db.collection('keyscollection');

            // Find Stripe "key"
            var findStripeKey = { '_id': 'stripe' };
            keys.find(findStripeKey).toArray((error, docs) =>
            {
                if (error)
                    return reject(error);

                // Add used key
                keys.update(findStripeKey,
                {
                    $push: {
                        KEYS_AVAIL_KEY: {
                            $each: [ steamKey ],
                            $position: 0
                        }
                    }
                });

                db.close();
                return resolve(true)
                    return reject(`Auto-Steam Keys out of stock! Email ${supportEmail} and let them know and deliver one ASAP!`);
            });
        });
    }).catch(err =>
    {
        console.error(err);
        return reject(err);
    });
}

// ...........................................................................................
// 20%
// function addAffiliate(ref, refName, refUrl)
// {
//     console.log('@ addAffiliate');
//
//     return new Promise ((resolve, reject) =>
//     {
//         // Standard URI format: mongodb://[dbuser:dbpassword@]host:port/dbname
//         mongodb.MongoClient.connect(mongoSecretURI, (err, db) =>
//         {
//             if (err)
//                 return reject(err);
//
//             console.log('[Stripe] @ addAffiliate: Connected');
//
//             // Get affiliates "collection"
//             var affiliates = db.collection('affiliates');
//
//             // Find Stripe "key"
//             var findStripeKey = { '_id': 'stripe' };
//             affiliates.find(findStripeKey).toArray((error, docs) =>
//             {
//                 if (error)
//                     return reject(error);
//
//                 // Add used key
//                 affiliates.update(findStripeKey,
//                 {
//                     $push: {
//                         KEYS_AVAIL_KEY: {
//                             $each: [ steamKey ],
//                             $position: 0
//                         }
//                     }
//                 });
//
//                 db.close();
//                 return resolve(true)
//                     return reject(`Auto-Steam Keys out of stock! Email ${supportEmail} and let them know and deliver one ASAP!`);
//             });
//         });
//     }).catch(err =>
//     {
//         console.error(err);
//         return reject(err);
//     });
// }

// ...........................................................................................
function delSteamKey(steamKey)
{
    console.log('@ delSteamKey');

    return new Promise ((resolve, reject) =>
    {
        // Standard URI format: mongodb://[dbuser:dbpassword@]host:port/dbname
        mongodb.MongoClient.connect(mongoSecretURI, (err, db) =>
        {
            if (err)
                return reject(err);

            console.log('[Stripe] @ delSteamKey: Connected');

            // Get keyscollection "collection"
            var keys = db.collection('keyscollection');

            // Find Stripe "key"
            var findStripeKey = { '_id': 'stripe' };
            keys.find(findStripeKey).toArray((error, docs) =>
            {
                if (error)
                    return reject(error);

                // Delete used key
                keys.update(findStripeKey,
                {
                    $pull: {
                        KEYS_AVAIL_KEY: steamKey
                    }
                });

                db.close();
                return resolve(true)
                    return reject(`Auto-Steam Keys out of stock! Email ${supportEmail} and let them know and deliver one ASAP!`);
            });
        });
    }).catch(err =>
    {
        console.error(err);
        return reject(err);
    });
}

// ...........................................................................................
// TODO: Add ip
function generateMetadata(ref, src, ip)
{
    var meta =
    {
        'ref': ref,
        'src': src,
        'ip': ip
    };

    if (ref) console.log('[Stripe-Meta] ref == ' + ref);
    if (STRIPE_DEBUG) console.log('[Stripe-Meta] src == ' + src);
    if (STRIPE_DEBUG) console.log('[StripeMeta] ip == ' + ip);

    return meta;
}

// ...........................................................................................
// Create a new customer and then a new charge for that customer
function chargeCust(res, product, custEmail, stripeToken, amt, qty, ref, src, ip)
{
    console.log('[Stripe] @ chargeCust');

    // Generate meta and prepare for results
    var meta = generateMetadata(ref, src, ip); // Add Steam key LATER to prevent hackers - and only in the charge.
    var results = {
        addBackSteamKeyOnErr: true
    };

    // Create a new customer and then a new charge for that customer:
    console.log('[Stripe-1] email == ' + custEmail);
    if (STRIPE_DEBUG) console.log('[Stripe-2] Creating a new customer...');
    stripe.customers.create({
        email: custEmail,
        metadata: meta

    }).then(customer =>
    {
        console.log('[Stripe-2] Success! customer ==  ' + customer);
        results.customer = customer;

        if (STRIPE_DEBUG) console.log('[Stripe-3] Getting customer charge source...');
        var tokenInfo =
        {
            source: stripeToken,
            metadata: meta
        }
        return stripe.customers.createSource(customer.id, tokenInfo);

    }).then((source) =>
    {
        console.log('[Stripe-3] Success! source == ' + source);
        results.source = source;

        if (STRIPE_DEBUG) console.log('[Stripe-4] Getting Steam key...');
        return getDelSteamKey();

    }).then((steamKey) =>
    {
        console.log('[Stripe-4] Success! steamKey==' + steamKey + " (+deleted from db for security)");
        results.steamKey = steamKey;

        if (STRIPE_DEBUG) console.log('[Stripe-5] Creating Stripe charge...');
        return createStripeCharge(steamKey, amt, results.source.customer, meta, product);

    }).then((charge) =>
    {
        // SUCCESS >> New charge created on a new customer
        console.log('[Stripe-5] Success! charge==' + charge);
        results.charge = charge;

        // Ensure we don't add back the Steam key at this point, even on err
        results.addBackSteamKeyOnErr = false;

        if (STRIPE_DEBUG) console.log('[Stripe-6] Rendering success receipt page...');
        renderReceipt(product, qty, custEmail, res);

        if (STRIPE_DEBUG) console.log('[Stripe-7] Getting Stripe pending/avail balances...');
        return getBalance();

    }).then((balance) =>
    {
        console.log('[Stripe-7] Success! balance == ' + tolCommon.J(balance));
        results.balance = balance;

        if (STRIPE_DEBUG) console.log("[Stripe-8] Sending Discord webhook...");

        var chargeObj;
        // if (IS_BETA)
        //     chargeObj = generateMockVerifyOrChargeResult().data.object;
        // else
        chargeObj = results.charge;
        return discord.discordSendStripeHook(chargeObj, balance); // (chargeObj, balance, [res])

    }).then((err, webhookRes, body) =>
    {
        console.log('[Stripe-8] Sending email, if affiliate sale...');
        // results.discordHookRes = webhookRes
        if (ref)
        {
            var affiliate = findAffiliateFromTag(ref);
            if (affiliate)
            {
                // Email affiliate informing of sale
                var emailTo = affiliate.email;
                var emailSubj = "[Throne of Lies] Notification of Affiliate Sale!";
                var emailBodyHtml = `
                    <h2>Greetings, ${affiliate.name},</h2>
                    <p>You had an affiliate sale from "${ref}:"</p>
                    <p>$10 * 0.3 (30%) = <strong>$3</strong> Commission!</p>
                    <p>Cheers,</p>
                    <br>
                    <p>-- Imperium42 Affiliate Team</p>`;
                tolMailer.sendEmail(emailTo, emailSub, emailBodyHtml);
            }
        }

        // FINISHED >>
        if (err)
            console.error('[Stripe-8-FINAL-RESULT] ERR: ' + J(err));
        else
            console.log('[Stripe-8-FINAL-RESULT] Success: ' + webhookRes.statusCode);

    }).catch((err) =>
    {
        // FAIL >>
        console.error('[STRIPE] Caught ERR: ' + tolCommon.J(err) + ( ' << (If empty, false positive: Successful webhook)')); // Why err?

        // Add Steam key back, if not yet charged on err
        if (results.addBackSteamKeyOnErr && results.steamKey)
        {
            if (STRIPE_DEBUG) console.log('[STRIPE] About to add back steamKey: ' + wasSteamKeyAdded);
            addSteamKey((results.steamKey)).then((wasSteamKeyAdded) =>
            {
                console.log('[STRIPE] Successfully added back steamKey: ' + wasSteamKeyAdded);
                var errCode = err.code || 500;
                if (!res.headersSent)
                    renderReceiptErr(err, res);
            })
            .catch((addSteamKeyBackErr) =>
            {
                // End
                console.error('[STRIPE] Caught ERR: Failed to add back Steam key! addSteamKeyBackErr==' + addSteamKeyBackErr);
                var errCode = err.code || 500;
                if (!res.headersSent)
                    renderReceiptErr(err, res);
            });
        }
        else
        {
            // End
            var errCode = err.code || 500;
                if (!res.headersSent)
                    renderReceiptErr(err, res);
        }
    });
}

// ..........................................................................................
function findAffiliateFromTag(refTag)
{
    for(var i = 0; i < affiliates.length; i++)
    {
        var a = affiliates[i];

        for (var y = 0; y < affiliates.tags; y++)
        if(a.refTags[y] == tag)
            return a;
    }
}

// ..........................................................................................
function createStripeCharge(steamKey, amt, cust, meta, product)
{
    // Add Steam key to charge, and also to meta for readability (easier to find)
    var chargeDescr = `${product.productDescription}:  ${steamKey}`;
    meta.steamKey = steamKey;

    console.log('[Stripe-4] Creating charge...');
    return stripe.charges.create({
        //amount: 1600,
        amount: amt,
        currency: 'usd',
        customer: cust,
        description: chargeDescr,
        metadata: meta
    });
}

// ..........................................................................................
// function generateMockBalance()
// {
//     console.log('@ generateMockBalance');
//
//     var mockBalance =
//     {
//         pending:
//         {
//             amount: 42.42
//         },
//         available:
//         {
//             amount: 42.43
//         }
//     };
//
//     console.log('Returning mock balance: ' + mockBalance)
//     return mockBalance;
// }

// ..........................................................................................
// function generateMockVerifyOrChargeResult()
// {
//     console.log('[STRIPE] @ generateMockVerifyResult');
//
//     var mockVerifyOrChargeRes =
//     {
//         data:
//         {
//             object:
//             {
//                 amount: 999,
//                 metadata:
//                 {
//                     src: 'throneoflies.com',
//                     ref: 'TEST-DEBUG'
//                 }
//             }
//         }
//     };
//
//     console.log('Returning mock verifyOrChargeResult: ' + mockVerifyOrChargeRes)
//     return mockVerifyOrChargeRes;
// }

// ..........................................................................................
// function generateMockSource()
// {
//     var mockSrc =
//     {
//         object: 'card',
//         exp_month: 10,
//         exp_year: 2018,
//         number: '4242 4242 4242 4242',
//         cvc: 100
//     };
//
//   return mockSrc;
// }

// ..........................................................................................
// Note: Node.js API does not throw exceptions, and instead prefers the
// asynchronous style of error handling described below.
//
// An error from the Stripe API or an otheriwse asynchronous error
// will be available as the first argument of any Stripe method's callback:
// E.g. stripe.customers.create({...}, function(err, result) {});
//
// Or in the form of a rejected promise.
// E.g. stripe.customers.create({...}).then(
//        function(result) {},
//        function(err) {}
//      );
function detectIfErrIsBankProblem(err)
{
    var isBankProblem = false;
    switch (err.type)
    {
        case 'StripeCardError':
            // A declined card error
            isBankProblem = true;
            break;
        case 'RateLimitError':
            // Too many requests made to the API too quickly
            break;
        case 'StripeInvalidRequestError':
            // Invalid parameters were supplied to Stripe's API
            break;
        case 'StripeAPIError':
            // An error occurred internally with Stripe's API
            break;
        case 'StripeConnectionError':
            // Some kind of error occurred during the HTTPS communication
            break;
        case 'StripeAuthenticationError':
            // You probably used an incorrect API key
            break;
        default:
            // Handle any other types of unexpected errors
            //isBankProblem = true;
            break;
    }

    return isBankProblem;
}

// module.exports = router;
module.exports =
{
    myRouter: router,
    stripeVerifyEvent: verifyEvent,
    stripeGetBalance: getBalance
};