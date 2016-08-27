var cors = require('express-cors');
var express = require('express');
var router = express.Router();

// Set cross-origin rules
router.use(cors({
  allowedOrigins: [
    '*'
  ]
}));

router.options('/', function (req, res) {
  console.log('Got CORS OPTIONS request for', req.originalUrl);
  res.send();
});

// GET home page
router.get('/', function(req, res, next) {
  res.render('index', { title: 'tol-node-public' });
});

module.exports = router;
