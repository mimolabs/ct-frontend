'use strict';

var exec = require('sync-exec');
var commitHash = exec('git log --pretty=format:"%h" -n 1');
var commitDate = exec('git log --pretty=format:"%ci" -n 1');
var api_url = process.env.MIMO_API_URL;
var dashboard_url = process.env.MIMO_DASHBOARD_URL;

module.exports = {
    frontend: {
        constants: {
            CONFIG: {},
            API_END_POINT: 'http://mimo.api:3000/api/v1',
            API_URL: 'http://mimo.api:3000',
            AUTH_URL: 'http://mimo.api:3000',
            INTERCOM: 'x',
            DRIFT: '',
            DEBUG: true,
            COLOURS: '#009688 #FF5722 #03A9F4 #607D8B #F44336 #00BCD4',
            COMMITHASH: commitHash.stdout,
            THEMES: []
        }
    },
    // Server configuration.
    server: {
        env: {
          DEBUG: false,
          // appID: process.env.APP_ID,
          // appSecret: process.env.APP_SECRET,
          // callbackURL: process.env.MIMO_DASHBOARD_URL + '/auth/login/callback',
          // authorizationURL: api_url + "/oauth/authorize",
          // profileURL: "http://api:3000/api/v1/me.json", // also?
          // tokenURL: "http://api:3000/oauth/token", // should change???
          // dashboardURL: dashboard_url
        }
    }
};
