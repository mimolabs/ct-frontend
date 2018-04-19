'use strict';

var app = angular.module('myApp.bulk_messages.directives', []);

app.directive('sendBulkMessage', ['$routeParams', 'BulkMessage', 'Sender', '$mdDialog', '$q', 'showToast', 'showErrors', 'Campaign', function($routeParams,BulkMessage, Sender, $mdDialog, $q, showToast, showErrors, Campaign) {

  var link = function( scope, element, attrs ) {

    var send = function(message) {
      BulkMessage.create({}, {
        location_id: $routeParams.id,
        person_id: $routeParams.person_id,
        bulk_message: message
      }).$promise.then(function(msg) {
        showToast('Message queued, please wait.');
      }, function(err) {
        showErrors(err);
      });
    };

    var getSenders = function() {
      var deferred = $q.defer();
      Sender.query({location_id: $routeParams.id, type: attrs.type}, function(data) {
        scope.senders = data.senders;
        deferred.resolve();
      }, function(err) {
        deferred.resolve();
      });
      return deferred.promise;
    };

    function DialogController($scope, valid, senders) {

      $scope.valid = valid;
      $scope.senders = senders;
      $scope.message = {type: attrs.type};

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

      $scope.tinymceOptions = {
        selector: 'textarea',
        height: 300,
        menubar: false,
        plugins: [
          'advlist autolink lists link image charmap print preview anchor textcolor',
          'searchreplace visualblocks code fullscreen',
          'insertdatetime media table contextmenu paste code wordcount'
        ],
        toolbar: 'insert | undo redo |  formatselect | bold italic backcolor  | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | code',
        content_css: []
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
    DialogController.$inject = ['$scope', 'valid', 'senders'];

    scope.compose = function(ev) {
      getSenders().then(function() {
        $mdDialog.show({
          controller: DialogController,
          templateUrl: 'components/views/bulk_messages/_compose.tmpl.html',
          parent: angular.element(document.body),
          targetEvent: ev,
          clickOutsideToClose:true,
          locals: {
            valid: false,
            senders: scope.senders
          }
        }).then(function(answer) {
        }, function() {
        });
      });
    };

  };

  var template = '<md-menu-item><md-button ng-click="compose()">Send {{type == "Twitter" ? "Tweet" : type}}</md-button></md-menu-item>';

  return {
    link: link,
    scope: {
      type: '@'
    },
    template: template
  };

}]);

app.directive('sendDirectMessage', ['$routeParams', 'BulkMessage', 'Sender', '$mdDialog', '$q', 'showToast', 'showErrors', 'Campaign', function($routeParams,BulkMessage, Sender, $mdDialog, $q, showToast, showErrors, Campaign) {

  var link = function( scope, element, attrs ) {

    var send = function(message) {
      BulkMessage.create({}, {
        location_id: $routeParams.id,
        person_id: $routeParams.person_id,
        bulk_message: message
      }).$promise.then(function(msg) {
        showToast('Message queued, please wait.');
      }, function(err) {
        showErrors(err);
      });
    };

    var getSenders = function() {
      var deferred = $q.defer();
      Sender.query({location_id: $routeParams.id, type: attrs.type}, function(data) {
        scope.senders = data.senders;
        deferred.resolve();
      }, function(err) {
        deferred.resolve();
      });
      return deferred.promise;
    };

    function DialogController($scope, valid, senders) {

      $scope.valid = valid;
      $scope.senders = senders;
      $scope.message = {type: attrs.type};

      $scope.selectedIndex = 0;



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

    var send = function(message) {
      $scope.cancel();
      send(message);
    };

    scope.tinymceOptions = {
      selector: 'textarea',
      height: 150,
      menubar: false,
      plugins: [
        'advlist autolink lists link image charmap print preview anchor textcolor',
        'searchreplace visualblocks code fullscreen',
        'insertdatetime media table contextmenu paste code wordcount'
      ],
      toolbar: 'insert | undo redo | formatselect | bold italic backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | code',
      content_css: []
    };

    getSenders()

  };


  return {
    link: link,
    scope: {
      type: '@'
    },
    templateUrl: 'components/views/bulk_messages/_compose_direct.html'
  };

}]);


app.directive('bulkMessages', ['$routeParams', 'BulkMessage', 'BulkMessageActivity', 'People', 'Location', '$mdDialog', '$location', function($routeParams,BulkMessage,BulkMessageActivity,People,Location,$mdDialog,$location) {

  var link = function( scope, element, attrs ) {

    scope.person = {};
    scope.location = {slug: $routeParams.id};
    scope.currentNavItem = 'messages';
    scope.message_types = ['Emails', 'Email Activity', 'SMS', 'Tweets'];
    scope.selected_type = 'Emails';

    var fetchMessages = function() {
      BulkMessage.index({}, {
        person_id:    scope.person.id || $routeParams.person_id,
        location_id:  scope.location.slug,
        start:        $routeParams.start,
        end:          $routeParams.end
      }).$promise.then(function(results) {
        scope.location.demo = attrs.demo;
        scope.messages = results.messages;
        scope.loading = undefined;
      });
    };

    var fetchMessageActivity = function() {
      BulkMessageActivity.index({}, {
        location_id:  scope.location.slug,
        start:        $routeParams.start,
        end:          $routeParams.end,
        message_id:   $routeParams.message_id,
        person_id:    scope.person.id
      }).$promise.then(function(results) {
        scope.location.demo = attrs.demo;
        scope.activity = results.activity;
        scope.loading = undefined;
      });
    };

    scope.updateMessages = function() {
      scope.loading = true;
      switch(scope.selected_type) {
        case 'Emails':
          fetchMessages();
          break;
        case 'Email Activity':
          fetchMessageActivity();
          break;
      }
    };

    var fetchPerson = function() {
      Location.get({id: $routeParams.id}, function(data) {
        scope.location = data;
      }, function(err){
        console.log(err);
      });
      People.query({location_id: scope.location.slug, id: $routeParams.person_id}).$promise.then(function(res) {
        scope.person = res;
        scope.currentNavItem = 'people';
        fetchMessages();
      }, function(err) {
        console.log(err);
      });
    };

    scope.query = function(person_id) {
      var hash            = {};
      hash.person_id      = person_id;
      hash.per            = $routeParams.per || 100;
      hash.start          = $routeParams.start;
      hash.end            = $routeParams.end;
      $location.search(hash);
      fetchMessages();
    };

    if ($routeParams.person_id) {
      fetchPerson();
    } else {
      fetchMessages();
    }

  };

  return {
    link: link,
    scope: {
      loading: '=',
      demo: '@'
    },
    templateUrl: 'components/views/bulk_messages/_index.html'
  };

}]);

app.directive('bulkMessageShow', ['$routeParams', 'BulkMessage', 'BulkMessageActivity', 'People', 'Location', '$mdDialog', '$location', function($routeParams,BulkMessage,BulkMessageActivity,People,Location,$mdDialog,$location) {

  var link = function( scope, element, attrs ) {

    scope.person = {id: $routeParams.person_id};
    scope.location = {slug: $routeParams.id};
    scope.currentNavItem = 'messages';

    var activity = function() {
      BulkMessageActivity.index({}, {
        location_id:  $routeParams.id,
        message_id: scope.message.message_id
      }).$promise.then(function(results) {
        scope.loading = undefined;
        scope.activity = results.activity;
      });
    };

    var getLocation = function() {
      Location.get({id: $routeParams.id}, function(data) {
        scope.location = data;
      }, function(err){
        console.log(err);
      });
    };

    var init = function() {
      if (scope.person.id) {
        getLocation();
        scope.currentNavItem = 'people';
      }
      BulkMessage.get({}, {
        message_id:   $routeParams.message_id,
        location_id:  $routeParams.id,
      }).$promise.then(function(results) {
        scope.loading = undefined;
        scope.message = results;
        activity();
      });
    };

    init();

  };

  return {
    link: link,
    scope: {
      loading: '='
    },
    templateUrl: 'components/views/bulk_messages/_show.html'
  };

}]);
