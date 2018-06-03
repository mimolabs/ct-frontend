'use strict';

var app = angular.module('myApp.menu.services', ['ngResource',]);

app.factory('menu', ['$location', '$rootScope', function ($location, $rootScope) {

  var sections = [{
  }];

  var self;

  return self = {
    sections: sections,
    isOpen: true,

    toggleSelectSection: function (section) {
      self.openedSection = (self.openedSection === section ? null : section);
    },
    isSectionSelected: function (section) {
      return self.openedSection === section;
    }
  };

}]);

app.factory('showToast', ['$mdToast', 'gettextCatalog', function ($mdToast, gettextCatalog) {

  function t(msg) {
    var toast = $mdToast.simple()
    .textContent(msg)
    .action(gettextCatalog.getString('Close'))
    .highlightAction(true)
    .hideDelay(3000);
    $mdToast.show(toast);
  }

  return t;

}]);

app.factory('showErrors', ['$mdBottomSheet', 'gettextCatalog', function ($mdBottomSheet, gettextCatalog) {

  var formatErrors = function(errors) {
    var e = [];

    if (errors.data && errors.data.message && Array.isArray(errors.data.message)) {
      console.log(errors.data.message)
      return errors.data.message;
    }

    console.log(errors);
    return ['Unknown error!'];
  };

  function MenuCtrl($scope, errors) {
    $scope.errors = errors;
    $scope.close = function() {
      $mdBottomSheet.hide();
    };
  }
  MenuCtrl.$inject = ['$scope','errors'];

  function t(msg) {
    var errors = formatErrors(msg);
    if (errors && errors.length > 0) {
      $mdBottomSheet.show({
        templateUrl: 'components/views/templates/_error_msg.html',
        locals: {
          errors: errors
        },
        controller: MenuCtrl,
        clickOutsideToClose: true
      });
    }
  }

  return t;

}]);

