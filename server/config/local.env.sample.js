'use strict';

var base_url, api_url, auth_url;

var exports;

if (process.env.NODE_ENV === 'production') {

  api_url = process.env.MIMO_API_URL;

  exports = {
    appID: process.env.APP_ID,
    appSecret: process.env.APP_SECRET,
    callbackURL: process.env.MIMO_DASHBOARD_URL + '/auth/login/callback',
    authorizationURL: api_url + "/oauth/authorize",
    profileURL: "http://api:3000/api/v1/me.json", // also?
    tokenURL: "http://api:3000/oauth/token" // should change???
  }

} else {

  api_url   = 'http://mimo.test:3000'

  exports = {
    appID: 'c10995e13ed31772362f0a6178ff3fe54272ff1a74c395ee0e886ede787fcd6e',
    appSecret: '9e52bfd3f6a6ca9988d8070bd9c52cb752e6bc8daadda77817d2121df2906330',
    callbackURL: 'http://app.oh-mimo.test:9090/auth/login/callback',
    authorizationURL: api_url + "/oauth/authorize",
    profileURL: api_url + "/api/v1/me.json",
    tokenURL: api_url + "/oauth/token"
  }

  var _ = require('../../node_modules/lodash');

  var localConfig;
  try {
      localConfig = require('./local-config.js');
  } catch(e) {
      localConfig = {};
  }

  exports = _.merge(exports, localConfig);
}

module.exports = exports;
