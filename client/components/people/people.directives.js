'use strict';

var app = angular.module('myApp.people.directives', []);

app.directive('listPeople', ['People', 'Location', '$routeParams', '$mdDialog', 'showToast', 'showErrors', '$q','pagination_labels', 'gettextCatalog', function(People,Location,$routeParams,$mdDialog,showToast,showErrors,$q, pagination_labels, gettextCatalog) {

  var link = function(scope, el, attrs, controller) {

    scope.currentNavItem = 'people'

    Location.get({id: $routeParams.id}, function(data) {
      scope.location = data;
    }, function(err){
      console.log(err);
    });

    People.get({location_id: $routeParams.id}, function(data) {
      scope.people = data.people;
    }, function(err){
      console.log(err);
    });

  };

  return {
    link: link,
    scope: {},
    templateUrl: 'components/locations/people/_index.html'
  };

}]);

app.directive('displayPerson', ['People', 'Location', '$routeParams', '$location', '$http', '$compile', '$rootScope', '$timeout', '$pusher', 'showToast', 'showErrors', 'menu', '$mdDialog', 'gettextCatalog', function(People, Location, $routeParams, $location, $http, $compile, $rootScope, $timeout, $pusher, showToast, showErrors, menu, $mdDialog, gettextCatalog) {

  var link = function(scope, element, attrs) {

    scope.currentNavItem = 'people'

    Location.get({id: $routeParams.id}, function(data) {
      console.log(data)
      scope.location = data;
      People.query({location_id: scope.location.slug, id: $routeParams.person_id}).$promise.then(function(res) {
        scope.person = res;
      }, function(err) {
        console.log(err);
      });
    }, function(err){
      console.log(err);
    });

    scope.back = function() {
      window.history.back();
    };

  };

  return {
    link: link,
    scope: {},
    templateUrl: 'components/locations/people/_show.html'
  };

}]);