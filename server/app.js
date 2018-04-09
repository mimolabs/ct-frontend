/**
 * Main application file
 */

'use strict';

// Set default node environment to development
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

var express = require('express');
var helmet = require('helmet');
var oauth = require('oauth');

var config = require('./config/environment');
// Setup server
var app = express();
const callback_url = "http://app.mimo.test:9090/auth/twitter/callback";

app.use(helmet());
app.use(helmet.xframe('deny'));
app.use(helmet.frameguard('deny'));
app.use(helmet.xssFilter());
app.use(helmet.hidePoweredBy());

var server = require('http').createServer(app);
require('./config/express')(app);

var consumer = new oauth.OAuth(
  "https://twitter.com/oauth/request_token", "https://twitter.com/oauth/access_token",
  (process.env.TWITTER_CONSUMER_KEY || '123'), (process.env.TWITTER_CONSUMER_SECRET || '123'), "1.0A", callback_url, "HMAC-SHA1");

app.get('/auth/twitter', function(req, res) {
  req.session.location = req.query.location;
  req.session.sender_name = req.query.sender_name;
  consumer.getOAuthRequestToken(function(error, oauthToken, oauthTokenSecret, results){
    if (error) {
      res.send("Error getting OAuth request token. Please contact support or try again.");
    } else {
      req.session.oauthRequestToken = oauthToken;
      req.session.oauthRequestTokenSecret = oauthTokenSecret;
      res.redirect("https://twitter.com/oauth/authorize?oauth_token="+oauthToken);
    }
  });
});

app.get('/auth/twitter/callback', function(req, res) {
  consumer.getOAuthAccessToken(req.session.oauthRequestToken, req.session.oauthRequestTokenSecret, req.query.oauth_verifier, function(error, oauthAccessToken, oauthAccessTokenSecret, results) {
    if (error) {
      res.send("Error getting OAuth access token. Please contact support or try again.");
    } else {
      req.session.oauthAccessToken = oauthAccessToken;
      req.session.oauthAccessTokenSecret = oauthAccessTokenSecret;
      req.session.screen_name = results.screen_name;
      if (!req.session.location || !req.session.oauthAccessToken || !req.session.oauthAccessTokenSecret) {
        res.redirect('/');
        return;
      }
      res.redirect('/#/' + req.session.location + '/campaigns/senders/new?sender_name=' + req.session.sender_name + '&oauth_access_token=' + req.session.oauthAccessToken + '&oauth_access_secret=' + req.session.oauthAccessTokenSecret + '&twitter_name=' + req.session.screen_name);
    }
  });
});

require('./routes')(app);

// Start server
server.listen(config.port, config.ip, function () {
  console.log('Express server listening on %d, in %s mode', config.port, app.get('env'));
});

exports = module.exports = app;
