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
  appID: process.env.APP_ID,
  appSecret: process.env.APP_SECRET,
  callbackURL: process.env.MIMO_DASHBOARD_URL + '/auth/login/callback',
  authorizationURL: api_url + "/oauth/authorize",
  profileURL: "http://api:3000/api/v1/me.json", // also?
  tokenURL: "http://api:3000/oauth/token", // should change???
  dashboardURL: dashboard_url
};

module.exports = opts
