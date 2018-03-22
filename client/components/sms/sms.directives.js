'use strict';

var app = angular.module('myApp.sms.directives', []);

app.directive('sendSms', ['$routeParams', 'Sms', '$mdDialog', 'showToast', 'showErrors', 'Campaign', function($routeParams,Sms,$mdDialog, showToast, showErrors, Campaign) {

  var link = function( scope, element, attrs ) {

    var send = function(message) {
      Sms.create({}, {
        location_id: $routeParams.id,
        person_id: $routeParams.person_id,
        bulk_message: message
      }).$promise.then(function(msg) {
        showToast('Message queued, please wait.');
      }, function(err) {
        showErrors(err);
      });
    };

    function DialogController($scope, valid) {

      scope.message = {};

      $scope.selectedIndex = 0;

      $scope.hide = function() {
        $mdDialog.hide();
      };

      $scope.cancel = function() {
        $mdDialog.cancel();
      };

      $scope.back = function() {
        if ($scope.selectedIndex > 0) {
          $scope.selectedIndex--;
        }
      };

      $scope.next = function() {
        if ($scope.selectedIndex < 3) {
          $scope.selectedIndex++;
        }
      };

      $scope.send = function(message) {
        $scope.cancel();
        send(message);
      };

      $scope.validateEmail = function(email) {
        Campaign.validate({}, {
          location_id: $routeParams.id,
          email: email
        }).$promise.then(function(msg) {
          $scope.valid = true;
        }, function(err) {
          if (err && err.data && err.data.message) {
            console.log(err);
            $scope.error = err.data.message[0];
            return;
          }
          $scope.valid = false;
        });
      };
    }
    DialogController.$inject = ['$scope', 'valid'];

    scope.compose = function(ev) {
      $mdDialog.show({
        controller: DialogController,
        templateUrl: 'components/sms/_compose.tmpl.html',
        parent: angular.element(document.body),
        targetEvent: ev,
        clickOutsideToClose:true,
        locals: {
          valid: false
        }
      }).then(function(answer) {
      }, function() {
      });
    };

  };

  var template =

    '<md-menu-item><md-button ng-click="compose()">Send SMS</md-button></md-menu-item>';

  return {
    link: link,
    template: template
  };

}]);
