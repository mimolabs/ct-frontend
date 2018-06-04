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
    appID: 'f547e59f95a868b9f264a4b6c571b0c4355362e59cb2d9279b1d7df7cfc4756a',
    appSecret: '91d0d9b0810dfe3637360d7b0bafbcdc15dd6906a015b913f367ff876414b0d8',
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
