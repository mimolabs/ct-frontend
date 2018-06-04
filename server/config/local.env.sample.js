'use strict';

var base_url, api_url, auth_url, dashboard_url;

var exports;

if (process.env.NODE_ENV === 'production') {

  api_url = process.env.MIMO_API_URL;
  dashboard_url = process.env.MIMO_DASHBOARD_URL;

  exports = {
    appID: process.env.APP_ID,
    appSecret: process.env.APP_SECRET,
    callbackURL: process.env.MIMO_DASHBOARD_URL + '/auth/login/callback',
    authorizationURL: api_url + "/oauth/authorize",
    profileURL: "http://api:3000/api/v1/me.json", // also?
    tokenURL: "http://api:3000/oauth/token", // should change???
    dashboardURL: dashboard_url
  }

} else {

  api_url         = 'http://mimo.api:3000';
  dashboard_url   = 'http://mimo.dashboard:9090'

  exports = {
    appID: 'be8fa02d10985ac05cb7e6637d20744690da0ad161bce7374c01d4c44bc757e0',
    appSecret: '1cf1103a13800c59f683c23795627e56961b3f3fd8b87937afd202310684a395',
    callbackURL: dashboard_url + '/auth/login/callback',
    authorizationURL: api_url + "/oauth/authorize",
    profileURL: api_url + "/api/v1/me.json",
    tokenURL: api_url + "/oauth/token",
    dashboardURL: dashboard_url
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
