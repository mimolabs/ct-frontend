'use strict';

var app = angular.module('myApp.senders.services', ['ngResource']);

app.factory('Sender', ['$resource', '$localStorage', 'API_END_POINT',
  function($resource, $localStorage, API_END_POINT){
    return $resource(API_END_POINT + '/locations/:location_id/senders/:id',
      {
        id: '@id',
        location_id: '@location_id'
      },
      {
      destroy: {
        method: 'DELETE',
        isArray: false,
        dataType: 'json'
      },
      create: {
        method:'POST',
        isArray: false,
      },
      query: {
        method:'GET',
        isArray: false
      }
    });
  }]);
