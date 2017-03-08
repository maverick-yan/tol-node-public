var cors = require('cors');
var express = require('express');
var router = express.Router();

// express-cors
//router.use(cors({
//    allowedOrigins: [
//        'throneoflies.com'
//    ]
//}));

// cors
var corsOptions = {
  origin: 'https://api.throneoflies.com/'
};
router.use(cors());

// GET home page
router.get('/', function(req, res, next) {
  res.render('index', { 
    title: 'tol-node-public',
    ver: '0.01'
  });
});

module.exports = router;
