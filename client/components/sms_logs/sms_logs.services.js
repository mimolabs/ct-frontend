'use strict';

var app = angular.module('myApp.sms_logs.services', ['ngResource']);

app.factory('SMSLog', ['$resource', '$localStorage', 'API_END_POINT',
  function($resource, $localStorage, API_END_POINT){
    return $resource(API_END_POINT + '/locations/:location_id/sms_logs',
      {
        location_id: '@location_id'
      },
      {
      query: {
        method:'GET',
        isArray: false
      }
    });
  }]);
