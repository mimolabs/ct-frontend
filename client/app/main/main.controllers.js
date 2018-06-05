'use strict';

var app = angular.module('myApp.controllers', [
  'myApp.authentications.controller',
  'myApp.boxes.controller',
  'myApp.invoices.controller',
  'myApp.locations.controller',
  'myApp.reports.controller',
  'myApp.splash_pages.controller',
  'myApp.registrations.controller',
  'myApp.users.controller',
]);

app.controller('MainCtrl', ['$rootScope', 'Location', '$scope', '$localStorage', '$window', '$location', '$routeParams', 'AccessToken', 'RefreshToken', 'Auth', 'API_END_POINT', '$route', 'onlineStatus', '$cookies', 'locationHelper', 'CTLogin', 'User', 'Me', 'AUTH_URL', 'API_URL', 'menu', 'designer', '$mdSidenav', '$mdMedia', '$q', 'INTERCOM', 'gettextCatalog', 'Translate', 'COMMITHASH', '$mdDialog',

  function ($rootScope, Location, $scope, $localStorage, $window, $location, $routeParams, AccessToken, RefreshToken, Auth, API, $route, onlineStatus, $cookies, locationHelper, CTLogin, User, Me, AUTH_URL, API_URL, menu, designer, $mdSidenav, $mdMedia, $q, INTERCOM, gettextCatalog, Translate, COMMITHASH, $mdDialog) {

    var domain = 'oh-mimo.com';

    $scope.commit = COMMITHASH;
    $scope.ct_login = CTLogin;
    $scope.squarelogo = API_URL + '/uploads/square-logo.png';
    if (!API_URL || API_URL === '') {
      $scope.squarelogo  = 'https://d247kqobagyqjh.cloudfront.net/api/file/cx7ecphTbq4GrzkMwiLr'
    }

    var ts = Math.floor(Date.now() / 1000);
    $scope.favicon = API_URL + '/uploads/favicon.ico?ts=' + ts;

    $scope.home = function() {
      var msg = 'Clicked Home';
      if ($routeParams.id && $location.path().split('/')[1] !== 'users') {
        $location.path('/' + $routeParams.id);
      } else {
        $location.path('/');
      }
    };

    $scope.settings = function(request) {
      var path = request || '/settings';
      if ($routeParams.id && $location.path().split('/')[1] !== 'users') {
        $location.path('/' + $routeParams.id + path);
      } else if ($cookies.get('_ctlid')) {
        var location = JSON.parse($cookies.get('_ctlid'));
        $location.path('/' + location.slug + path);
      } else {
        $location.path('/');
      }
    };

    function isOpen(section) {
      return (menu.isSectionSelected(section) && menu.isOpen());
    }

    $scope.toggle = function(section){
      $mdSidenav(section || 'left').toggle();
    };

    var toggleOpen = function(){
      if ($mdMedia('gt-sm')) {
        vm.menu.isOpenLeft = false;
        menu.isOpen = !menu.isOpen;
        vm._ctm = !vm._ctm;
        $cookies.put('_ctm', !menu.isOpen);
      } else {
        vm.menu.isOpenLeft = !vm.menu.isOpenLeft;
      }
      $(window).trigger('resize');
    };

    function toggle(section) {
      menu.toggleSelectSection(section);
    }

    var vm = this;

    vm._ctm = $cookies.get('_ctm');
    vm.menu = menu;

    vm.designer = designer;
    vm.toggle = toggle;

    if ($cookies.get('_ctm') === 'true') {
      vm.menu.isOpenLeft = false;
      vm.menu.isOpen = false;
    }

    vm.menu.main = [];
    vm.settingsMenu = [];
    vm.menuRight = [];

    vm.status = {
      isFirstOpen: true,
      isFirstDisabled: false
    };

    $scope.$on('logout', function(args) {
      logout().then(function(response) {
        $route.reload();
        console.log('Refreshing Token.');
      }, function() {
        Auth.fullLogin();
      });
    });

    var logout = function(args) {
      var deferred = $q.defer();
      var user = $localStorage.mimo_user;
      var path = $location.path();
      AccessToken.del();
      if ( user && user.refresh ) {
        var host  = locationHelper.domain();
        // Save the path
        $cookies.put('_ctp', JSON.stringify(path) );
        RefreshToken.refresh(user.refresh, path).then(function(response) {
          Auth.refresh(response).then(function(a){
            deferred.resolve();
          });
        }, function(er) {
          deferred.reject();
        });
      } else {
        deferred.reject();
      }
      return deferred.promise;
    };

    $scope.$on('login', function(args,event) {
      console.log('Logging in...');
      doLogin(event);
    });

    function doLogin(event) {
      Auth.login(event.data).then(function(a) {
        var path;
        $scope.loggedIn = true;
        if (event.path) {
          path = event.path;
        } else {
          var raw = $cookies.get('_ctp');
          if (raw) {
            try{
              path = JSON.parse(raw);
            }catch(e){
              console.log('Couldn\'t parse JSON to redirect');
            }
          }
        }
        $location.path(path || '/').search(event.search || {});
        if (event !== undefined && event.rdir !== undefined) {
          $location.search({rdir: event.rdir});
        }
        $cookies.remove('_ctp');
        $scope.ct_login = undefined;
        // Translate.load();
      });
    }

    $scope.$on('supportWidget', function(args,event) {
      var user = Auth.currentUser();
      var params = {
        email: user.email,
        name: 'user.username',
        created_at: user.created_at,
      };

      if (user && user.settings) {
        if (user.settings.intercom_id) {
          params.app_id = user.settings.intercom_id;
          params.user_id = user.account_id;
          window.intercomSettings = params;
        } else if (user.settings.drift_id) {
          window.drift.SNIPPET_VERSION = '0.3.1';
          window.drift.load(user.settings.drift_id);
        }
      }
    });

    function menuPush() {
      if (vm.menu.main.length === 0) {
        vm.menuRight.push({
          name: gettextCatalog.getString('Profile'),
          link: '/#/me',
          type: 'link',
          icon: 'face'
        });
      }
    }

    var setDefaultImages = function(sub) {
    };

    var removeCtCookie = function() {
      $cookies.remove('_ct', { domain: domain });
    };

    function getMe() {
      Me.get({}).$promise.then(function(res) {
        Auth.login(res).then(function(a) {
          $scope.user = Auth.currentUser();
          $scope.loggedIn = true;
          menuPush();
          // if ($scope.user.promo !== '') {
          //   console.log('Getting promo...');
          // }
        });
      });
    }

    function routeChangeStart() {
      var a = AccessToken.get();
      if ( (!Auth.currentUser() && a ) || Auth.currentUser() ) {
        getMe();
        $scope.$broadcast('supportWidget', {hi: 'user'});
      }
    }

    var setLoggedIn = function(isLoggedIn) {
      $scope.loggedIn = isLoggedIn;
      return isLoggedIn;
    };

    setLoggedIn(AccessToken.get() !== undefined);

    $scope.logout = function() {
      Auth.logout();
    };

    $rootScope.$on('$routeChangeStart', function (event, next, current) {
      routeChangeStart();
    });

    var getLocations = function() {
      Location.query({
      }).$promise.then(function(results) {
        // scope.total_locs  = results._links.total_entries;
        $scope.locations   = results.locations;
        // scope._links      = results._links;
        // // filterLocationOwners();
        // scope.searching   = undefined;
        // scope.loading     = undefined;
      }, function() {
        // scope.loading   = undefined;
        // scope.searching = undefined;
      });
    };

    $scope.newLocation = function() {
      window.location.href = '/#/new-location';
    };

    $scope.toggleLocations = function() {
      var locationSidebar = document.getElementById("locationSidebar");

      if (locationSidebar.classList.contains('md-closed')) {
          $mdSidenav('locations').open();
          getLocations();
      } else {
          $mdSidenav('locations').close();
      }

      $rootScope.$on('$routeChangeStart', function (event, next, current) {
        $mdSidenav('locations').close();
      });
    };

    $scope.toggleSidenav = function() {
      var locationSidebar = document.getElementById("mainSidebar");

      if (locationSidebar.classList.contains('md-closed')) {
          $mdSidenav('left').open();
      } else {
          $mdSidenav('left').close();
      }

      $rootScope.$on('$routeChangeStart', function (event, next, current) {
        $mdSidenav('left').close();
      });
    };


}]);

app.controller( 'ParentCtrl', function ParentCtrl($scope, onlineStatus) {
});
