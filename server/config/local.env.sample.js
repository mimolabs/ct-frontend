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
    appID: 'dbbfa1a4291b7756c3edd2728ba92428df01ded6560c6e2c38fca5c821dac809',
    appSecret: '49ae2624528914b6cc9f2528d5f0d903df1b641d2802358614c3d0e35e34dd68',
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
