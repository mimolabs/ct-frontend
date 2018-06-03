'use strict';

var exec = require('sync-exec');
var commitHash = exec('git log --pretty=format:"%h" -n 1');
var commitDate = exec('git log --pretty=format:"%ci" -n 1');

module.exports = {
    frontend: {
        constants: {
            CONFIG: {},
            API_END_POINT: 'http://mimo.api:3030/api/v1',
            API_URL: 'http://mimo.api:3030',
            AUTH_URL: 'http://mimo.api:3030',
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
        }
    }
};
