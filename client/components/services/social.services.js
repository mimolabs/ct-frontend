'use strict';

var app = angular.module('myApp.social.services', ['ngResource',]);

app.factory('Social', ['$resource', '$localStorage', 'API_END_POINT',
  function($resource, $localStorage, API_END_POINT){
    return $resource(API_END_POINT + '/locations/:location_id/people/:person_id/socials/:id',
      {
        q: '@q',
        id: '@id',
        location_id: '@location_id',
        person_id: '@person_id'
      },
      {
      get: {
        method: 'GET',
        isArray: false,
        dataType: 'json',
        params: {
          q: '@q'
        }
      },
      query: {
        method: 'GET',
        isArray: false,
        dataType: 'json',
        params: {
          id: '@id'
        }
      },
      update: {
        method: 'PATCH',
        params: {
          id: '@id',
          social: '@social'
        }
      }
    });
  }]);

