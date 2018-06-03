var opts = { 
  frontend: {
    constants: {
      INTERCOM: '',
      DRIFT: '',
      API_END_POINT: '',
      API_URL: '',
      AUTH_URL: '',
    }
  },
  appID:              'APP_ID',
  appSecret:          'APP_SECRET',
  callbackURL:        'MIMO_DASHBOARD_URL' + '/auth/login/callback',
  authorizationURL:   'MIMO_API_URL' + "/oauth/authorize",
  dashboardURL:       'MIMO_DASHBOARD_URL',
  profileURL:         "http://api:3000/api/v1/me.json", 
  tokenURL:           "http://api:3000/oauth/token", 
};


module.exports = opts
