// ...........................................................................................
// routes/stripe.js
var fs = require('fs');
var cors = require('cors');
var express = require('express');
var mongodb = require('mongodb');
var router = express.Router();
var tolCommon = require('./scripts/tolCommon');
var tolMailer = require('./mailer');
var discord = require('./discord');

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
//var liveSecret = secretKeys.stripeLiveSecret;

var mongoSecrets = secretKeys.mongo;
var mongoSecretURI = mongoSecrets.uri;

// ...........................................................................................
// Stripe setup
// https://github.com/stripe/stripe-node
var stripe = require('stripe')(testSecret);
stripe.setTimeout(20000); // in ms (this is 20 seconds)

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
router.get('/', cors(corsOptions), function(req, res, next) 
{
  res.jsonp({ status: 'ONLINE' });
});

// ...........................................................................................
// GET - Test display product receipt
router.get('/charge/test', cors(corsOptions), function(req, res)
{
  var product = products[0];
  var qty = 1;
  var email = 'blah@blah.com';
  
  renderReceipt(product, qty, email, res);
});

// ...........................................................................................
// GET - Test display product receipt ERROR
router.get('/charge/testErr', cors(corsOptions), function(req, res)
{
  //var product = products[0];
  //var qty = 1;
  //var email = 'blah@blah.com';

  var err = 
  {
    type: 'StripeCardError',
    message: 'This is a test error'
  };

  renderReceiptErr(err, res);
});

// ...........................................................................................
// GET - Test display product receipt ERROR
router.get('/testbalance', cors(corsOptions), function(req, res)
{
    getBalance().then((balance) =>
    {
        console.log('success: ' + tolCommon.J(balance))

        console.error('[STRIPE-RESULT] success @ /testbalance');
        res.send(balance);
    })
    .catch((err) =>
    {
        console.log('err: ' + tolCommon.J(err))
        console.error('[STRIPE-RESULT] Err result @ /testbalance');
        res.status(500).send(err);
    });
});

// ...........................................................................................
function renderReceiptErr(err, res)
{
    console.error('[STRIPE-RESULT] Err @ renderReceiptErr()');
    res.status(500).render('receiptErr',
    {
        title: 'UNSUCCESSFUL Purchase | Throne of Lies (Imperium42)',
        //email: email,
        errMsg: err.message
    });
}

// ...........................................................................................
function renderReceipt(product, qty, email, res)
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
        email: email
    });
}

// ...........................................................................................
// GET - IP tester
router.get('/iptest', (req, res) =>
{
    // var ip1 = req.body.client_ip;
    // console.log('ip1==' + ip1);

    var ip2 = tolCommon.getIP(req);
    console.log('ip2==' + ip2);

    res.send(ip2);
});

// ...........................................................................................
// POST - Process charge, then show results
router.post('/charge/:name', cors(corsOptions), function(req, res)
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
    .catch((err) =>
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
    .catch((err) =>
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
router.get('/dbtest', (req, res) =>
{
    console.log('@ GET /dbtest');

    getSteamKey().then((steamKey) =>
    {
        // console.log('keyIndex==' + steamKey);
        res.send(steamKey || "nada");
    })
    .catch((err) =>
    {
        res.status(500).send(err);
    })
});

// ...........................................................................................
function getSteamKey()
{
    console.log('@ getSteamKey');

    return new Promise ((resolve, reject) =>
    {
        // Standard URI format: mongodb://[dbuser:dbpassword@]host:port/dbname
        mongodb.MongoClient.connect(mongoSecretURI, (err, db) =>
        {
            if (err)
                return reject(err);

            console.log('[Stripe] @ getSteamKey: Connected');

            var keys = db.collection('keyscollection');

            keys.find({ '_id': 'stripe' }).toArray((error, docs) =>
            {
                if (error)
                    return reject(error);

                var steamKey = docs[0].keysAvail[0];
                console.log('getSteamKey() steamKey==' + steamKey);

                db.close();
                if (steamKey)
                {
                    return resolve(steamKey)
                }
                else
                    return reject("Auto-Steam Keys out of stock! Email support@imperium42.com and let them know and deliver one ASAP!");
            });
        });
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

    console.log('[Stripe-Meta] ref == ' + ref);
    console.log('[Stripe-Meta] src == ' + src);
    console.log('[StripeMeta] ip == ' + ip);

    return meta;
}

// ...........................................................................................
/* Create a new customer and then a new charge for that customer

stripeToken			The ID of the token representing the payment details
stripeEmail			The email address the user entered during the Checkout process
stripeBillingName
stripeBillingAddressLine1
stripeBillingAddressZip
stripeBillingAddressState
stripeBillingAddressCity
stripeBillingAddressCountry	Billing address details (if enabled)
stripeShippingName
stripeShippingAddressLine1
stripeShippingAddressZip
stripeShippingAddressState
stripeShippingAddressCity
stripeShippingAddressCountry	Shipping address details (if enabled)
*/
//function chargeCust(custEmail, cardExpMonth, cardExpYear, cardNum, cardCVC, amt, currency)
function chargeCust(res, product, custEmail, stripeToken, amt, qty, ref, src, ip)
{
    console.log('[STRIPE] @ chargeCust');

    // Generate meta and prepare for results
    var meta = generateMetadata(ref, src, ip); // Add Steam key LATER to prevent hackers - and only in the charge.
    var results = {};

    // Create a new customer and then a new charge for that customer:
    console.log('[Stripe-1] email == ' + custEmail);
    stripe.customers.create({
        email: custEmail,
        metadata: meta

    }).then((customer) =>
    {
        console.log('[Stripe-2] customer ==  ' + customer);
        results.customer = customer;

        return stripe.customers.createSource(customer.id,
        {
            //source: generateMockSource(),
            source: stripeToken,
            metadata: meta
        });

    }).then((source) =>
    {
        console.log('[Stripe-3] source == ' + source);
        results.source = source;

        // Get Steam key
        console.log('[Stripe-3] Getting Steam key...');
        return getSteamKey();

    }).then((steamKey) =>
    {
        console.log('[Stripe-4] steamKey==' + steamKey);
        results.steamKey = steamKey;

        // Add Steam key to charge, and also to meta for readability (easier to find)
        var chargeDescr = `${product.productDescription}:  ${steamKey}`;
        meta.steamKey = steamKey;

        console.log('[Stripe-4] Creating charge...');
        return stripe.charges.create({
            //amount: 1600,
            amount: amt,
            currency: 'usd',
            customer: results.source.customer,
            description: chargeDescr,
            metadata: meta
        });

    }).then((charge) =>
    {
        // SUCCESS >> New charge created on a new customer
        console.log('[Stripe-5] Success (showing receipt page now)! charge == ' + charge);
        results.charge = charge;

        //res.send(charge);
        renderReceipt(product, qty, custEmail, res);

        console.log('[Stripe-5] Getting balance...');
        return getBalance();

    }).then((balance) =>
    {
        console.log('[Stripe-6] Success! balance == ' + tolCommon.J(balance));
        results.balance = balance;

        console.log("[Stripe-6] Sending Discord webhook...");
        var chargeObj = generateMockVerifyOrChargeResult().data.object;
        return discord.discordSendStripeHook(chargeObj, balance); // (verifyResult, balance, [res])

    }).then((err, webhookRes, body) =>
    {
        if (err)
            console.error('[Stripe-7-RESULT] ERR: ' + J(err));
        else
            console.log('[Stripe-7-RESULT] Success: ' + webhookRes.statusCode);

    }).catch((err) =>
    {
        // FAIL >>
        console.log('[STRIPE] Caught ERR: ' + tolCommon.J(err) + ( ' << (If empty, false positive: Successful webhook)')); // Why err?
        var errCode = err.code || 500;
        //res.status(errCode).send(err);
        if (!res.headersSent)
            renderReceiptErr(err, res);
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
function generateMockVerifyOrChargeResult()
{
    console.log('[STRIPE] @ generateMockVerifyResult');

    var mockVerifyOrChargeRes =
    {
        data:
        {
            object:
            {
                amount: 999,
                metadata:
                {
                    src: 'throneoflies.com',
                    ref: 'TEST-DEBUG'
                }
            }
        }
    };

    console.log('Returning mock verifyOrChargeResult: ' + mockVerifyOrChargeRes)
    return mockVerifyOrChargeRes;
}

// ..........................................................................................
function generateMockSource()
{
    var mockSrc =
    {
        object: 'card',
        exp_month: 10,
        exp_year: 2018,
        number: '4242 4242 4242 4242',
        cvc: 100
    };
  
  return mockSrc;
}

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
function handleErr(err)
{
  switch (err.type) 
  {
    case 'StripeCardError':
      // A declined card error
      err.message; // => e.g. "Your card's expiration year is invalid."
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
      break;
    }
}

// module.exports = router;
module.exports =
{
    myRouter: router,
    stripeVerifyEvent: verifyEvent,
    stripeGetBalance: getBalance
};
