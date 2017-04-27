var express = require('express');
var favicon = require('serve-favicon');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var publicRoutes = require('./routes/index');
var playfab = require('./routes/playfab');
var mailer = require('./routes/mailer');
var stripe = require('./routes/stripe');
//var discourse = require('./routes/discourse.router');
var discordView = require('./routes/discord');
var myViews = require('./routes/views');

var app = express();

// Favicon
app.use(favicon(path.join(__dirname, 'public', 'images', 'favicon-256.png')));

// Set template engine (NOTE: jade is now called 'pug')
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ROUTES >>
app.use('/', publicRoutes.myRouter);
app.use('/discord', discordView.myRouter);
app.use('/playfab', playfab.myRouter);
app.use('/mailer', mailer.myRouter);
app.use('/stripe', stripe.myRouter);
//app.use('/discourse', discourse.myRouter);
app.use('/views', myViews.myRouter);

// 404 >>
app.use(function(req, res, next){
  res.status(404);

  // respond with html page
  if (req.accepts('html')) {
    res.render('404', { url: req.url });
    return;
  }

  // respond with json
  if (req.accepts('json')) {
    res.send({ error: 'Not found' });
    return;
  }

  // default to plain-text. send()
  res.type('txt').send('Not found');
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
//module.exports: {
//  app: express()
//}