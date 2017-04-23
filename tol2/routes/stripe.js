// ...........................................................................................
// routes/stripe.js
var fs = require('fs');
var cors = require('cors');
var express = require('express');
var router = express.Router();
var tolCommon = require('./scripts/tolCommon');
var tolMailer = require('./mailer');

// cors
var whitelist = ['https://throneoflies.com', 'https://www.throneoflies.com, https://api.throneoflies.com'];
var corsOptions = {
  origin: whitelist,
  optionsSuccessStatus: 200
};
router.options(whitelist, cors()); // include before other routes

// Read JSON keys file sync - You need to edit ./data/secret-keys-json with your own title+secret
var secretKeys = JSON.parse(fs.readFileSync('./data/secret-keys.json', 'utf8'));
var testSecret = secretKeys.stripeTestSecret;
var liveSecret = secretKeys.stripeLiveSecret;

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
    productDescription: '1x Steam Key (Alpha+ Access)',
    productPrice: 9.99
  }
];

// ...........................................................................................
// GET - Test (root)
router.get('/', cors(corsOptions), function(req, res, next) 
{
  res.jsonp({ status: 'ONLINE' });
});

// ...........................................................................................
// GET - Test display product
router.get('/charge/:name', cors(corsOptions), function(req, res)
{
  var email = 'dylanh724@gmail.com';
  var result = chargeCust(res, email);
});

// ...........................................................................................
// POST - Process charge, then show results
router.post('/charge/:name', cors(corsOptions), function(req, res)
{
  var productName = req.params.name;
  var stripeToken = req.body.stripeToken;

  console.log(req.body);  
  
  console.log(`@ /charge/${productName} GET`);
  var product = getProduct(productName);

  // Validate product
  if (!product)
    return res.status(500).send('Product does not exist.');
    
  // Success >>
  var email = 'dylanh724@gmail.com';
  var result = chargeCust(res, email);
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
function chargeCust(res, custEmail)
{
  console.log('@ chargeCust: ' + custEmail);

  // Create a new customer and then a new charge for that customer:
  console.log('[Stripe-1]');
  stripe.customers.create({
    email: 'foo-customer@example.com'
  }).then(function(customer)
  {
    console.log('[Stripe-2] customer ==  ' + customer); 
    return stripe.customers.createSource(customer.id, {
      source: 
      {
         object: 'card',
         exp_month: 10,
         exp_year: 2018,
         number: '4242 4242 4242 4242',
         cvc: 100
       }
    });
  }).then(function(source) 
  {
    console.log('[Stripe-3] source == ' + source);
    return stripe.charges.create({
      amount: 1600,
      currency: 'usd',
      customer: source.customer
    });
  }).then(function(charge) 
  {
    // SUCCESS >> New charge created on a new customer
    console.log('[Stripe-4] Success! charge == ' + charge);
    res.send(charge);
  }).catch(function(err) 
  {
    // FAIL >>
    console.log('[Stripe] ERR: ' + err);
    res.status(err.code).send(err);
  });
}

// ..........................................................................................


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

module.exports = router;