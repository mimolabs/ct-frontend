'use strict';

var app = angular.module('myApp.directives', [
  'myApp.boxes.directives',
  'myApp.bulk_messages.directives',
  'myApp.bulk_message_activity.directives',
  'myApp.campaigns.directives',
  'myApp.charts.directives',
  'myApp.clients.directives',
  'myApp.emails.directives',
  'myApp.forms.directives',
  'myApp.google.maps.directives',
  'myApp.guests.directives',
  'myApp.invoices.directives',
  'myApp.invites.directives',
  'myApp.locations.directives',
  'myApp.main.directives',
  'myApp.menu.directives',
  'myApp.people.directives',
  'myApp.plans.directives',
  'myApp.quotas.directives',
  'myApp.registrations.directives',
  'myApp.reports.v2.directives',
  'myApp.splash_pages.directives',
  'myApp.users.directives',
]);

app.directive('formErrors', [function () {
  return {
    restrict: 'E',
    template: '<p class="text text-danger" ng-show="myForm.errors"><b>There\'s been a problem saving the form. A list of errors can be found above.</b></p>'
  };
}]);

app.directive('formSuccess', [function () {
  return {
    restrict: 'E',
    template: '<p class="text-success"><b>Settings Updated <i class="fa fa-check fa-fw"></i></b></p>'
  };
}]);

app.factory('onlineStatus', ['$window', '$rootScope', function ($window, $rootScope) {
    var onlineStatus = {};

    onlineStatus.onLine = $window.navigator.onLine;

    onlineStatus.isOnline = function() {
        return onlineStatus.onLine;
    };

    $window.addEventListener('online', function () {
        onlineStatus.onLine = true;
        $rootScope.$digest();
    }, true);

    $window.addEventListener('offline', function () {
        onlineStatus.onLine = false;
        $rootScope.$digest();
    }, true);

    return onlineStatus;
}]);

app.directive('sidebar', ['$compile', '$location', '$routeParams', function ($compile, $location, $routeParams) {

  var link = function(scope,element,attrs) {

    function sortSideBar () {
      var path = $location.path().split('/');
      var base = path[1];
      var sub = path[3];
      if ( base !== undefined) {
        if ( sub === 'boxes' && $routeParams.id !== undefined) {
          scope.box = { slug: $routeParams.id };
          scope.location = { slug: $routeParams.location_id };
          scope.getSideBar = 'components/locations/layouts/sidebar.html';
        }
        else if (base === 'locations') {
          var id = $routeParams.location_id || $routeParams.id;
          scope.location = { slug: id };
          scope.getSideBar = 'components/locations/layouts/sidebar.html';
        }
        else if (base === 'me' || base === 'users') {
          scope.getSideBar = 'components/users/layouts/sidebar.html';
        }
      }
    }

    scope.$on('$routeChangeSuccess', function (event, current, previous) {
      sortSideBar();
    });

  };

  return {
    link: link,
    template: '<div ng-include="getSideBar"></div>'
  };
}]);

app.directive('navbar', ['$compile', '$location', function ($compile, $location) {

  var link = function(scope,element,attrs) {

  };

  return {
    link: link,
    templateUrl: 'components/navbar/navbar.html'
  };

}]);

app.directive('confirmOnExit', ['$mdDialog', '$location','gettextCatalog', function($mdDialog,$location, gettextCatalog) {
  return {
    link: function($scope, elem, attrs) {

      var n = true;
      $scope.$on('$locationChangeStart', function(event, next, current) {
        if ($scope.myForm.$dirty && n) {
          event.preventDefault();
          var confirm = $mdDialog.confirm()
          .title(gettextCatalog.getString('Unsaved Changes'))
          .textContent(gettextCatalog.getString('You have unsaved changes. Are you sure you want to leave the page?'))
          .ariaLabel(gettextCatalog.getString('Unsaved'))
          .ok(gettextCatalog.getString('Continue'))
          .cancel(gettextCatalog.getString('Cancel'));
          $mdDialog.show(confirm).then(function() {
            n = undefined;
            window.location.href = next;
          });
        }
      });
    }
  };
}]);
