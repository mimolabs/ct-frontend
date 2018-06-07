'use strict';

var app = angular.module('myApp.data_requests.services', ['ngResource',]);

app.factory('DataRequest', ['$resource', '$localStorage', 'API_END_POINT',
function($resource, $localStorage, API_END_POINT){
  return $resource(API_END_POINT + '/data_requests/:type',
    {
      id: '@id'
    },
    {
    query: {
      method: 'GET',
      isArray: false,
      dataType: 'json',
      params: {
        code: '@code',
        person_id: '@person_id'
      }
    },
    timeline_query: {
      method: 'GET',
      isArray: false,
      dataType: 'json',
      params: {
        code: '@code',
        type: 'timeline',
        person_id: '@person_id'
      }
    },
    download: {
      method: 'PATCH',
      isArray: false,
      params: {
        email: '@email',
        code: '@code',
        person_id: '@person_id'
      }
    },
    destroy: {
      method: 'DELETE',
      isArray: false,
      dataType: 'json',
      params: {
        code: '@code',
        person_id: '@person_id'
      }
    }
  });
}]);