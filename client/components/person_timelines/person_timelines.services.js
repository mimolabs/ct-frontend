'use strict';

var app = angular.module('myApp.person_timelines.services', ['ngResource',]);

app.factory('PersonTimeline', ['$resource', '$localStorage', 'API_END_POINT',
  function($resource, $localStorage, API_END_POINT){
    return $resource(API_END_POINT + '/locations/:location_id/people/:person_id/person_timelines',
      {
        location_id: '@location_id',
        person_id: '@id'
      },
      {
      query: {
        method: 'GET',
        isArray: false,
        dataType: 'json'
      }
    });
  }]);
