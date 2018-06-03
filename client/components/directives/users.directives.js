'use strict';

var app = angular.module('myApp.users.directives', []);

app.directive('userAvatar', [function() {
  return {
    replace: true,
    template: '<md-icon><img class=\'user-avatar\' src="https://www.gravatar.com/avatar/{{user.gravatar}}?s=25" ng-if=\'user.gravatar\'></img><span ng-if=\'!user.gravatar\'>face</span></md-icon>'
  };
}]);

app.directive('showUser', ['User', '$routeParams', '$location', '$route', 'Auth', 'showToast', 'showErrors', '$window', 'gettextCatalog', 'Translate', '$cookies', '$mdDialog', function(User, $routeParams, $location, $route, Auth, showToast, showErrors, $window, gettextCatalog, Translate, $cookies, $mdDialog) {

  var link = function( scope, element, attrs ) {

    scope.currentNavItem = 'profile'

    var id, locale;
    // Check git history to more vars;
    // scope.locales = [{key: 'Deutsch', value: 'de-DE'}, { key: 'English', value: 'en-GB'}];

    if ($location.path() === '/me' || Auth.currentUser().slug === $routeParams.id) {
      id = Auth.currentUser().slug;
    } else {
      id = $routeParams.id;
    }

    var init = function() {
      User.query({id: id}).$promise.then(function (res) {
        scope.user = res;
        // locale = res.locale;
        if (scope.user.slug === Auth.currentUser().slug) {
          scope.user.allowed = true;
        }
        if (scope.user.role_id === 1 || scope.user.role_id === 2 || scope.user.role_id === 3) {
          scope.user.admin = true;
        }
        scope.loading = undefined;
      });
    };

    scope.confirmDelete = function(email) {
      User.destroy({id: id, email: email}).$promise.then(function() {
        Auth.logout();
      }, function(err) {
        showErrors(err);
      });
    };

    function DialogController($scope) {
      $scope.delete = function(email) {
        var msg = 'Delete Account';
        console.log(msg);
        scope.confirmDelete(email);
        $mdDialog.cancel();
      };
      $scope.close = function() {
        $mdDialog.cancel();
      };
    }
    DialogController.$inject = ['$scope'];

    scope.deleteAccount = function() {
      $mdDialog.show({
        templateUrl: 'components/users/show/_delete_account.html',
        parent: angular.element(document.body),
        controller: DialogController
      });
    };

    scope.update = function(form) {
      form.$setPristine();
      scope.user.plan = undefined;
      User.update({}, {
        id: scope.user.slug,
        user: scope.user
      }).$promise.then(function(results) {
        showToast(gettextCatalog.getString('User successfully updated.'));
      }, function(err) {
        showErrors(err);
      });
    };
    init();
  };

  return {
    link: link,
    scope: {
      loading: '='
    },
    templateUrl: 'components/users/show/_index.html'
  };

}]);

app.directive('userBilling', ['User', '$routeParams', '$location', 'Auth', 'showToast', 'showErrors', 'gettextCatalog', function(User, $routeParams, $location, Auth, showToast, showErrors, gettextCatalog) {

  var link = function( scope, element, attrs ) {

    scope.currentNavItem = 'billing'

    scope.currencies = { 'US Dollars' : 'USD', 'UK Pounds': 'GBP', 'EUR': 'Euros' };

    var formatCurrency = function() {
      if (scope.user && scope.user.plan) {
        switch(scope.user.plan.currency) {
          case 'GBP':
            scope.user.plan.currency_symbol = '$';
            break;
          case 'EUR':
            scope.user.plan.currency_symbol = '€';
            break;
          default:
            scope.user.plan.currency_symbol = '$';
            break;
        }
      }
    };

    var init = function() {
      User.query({id: $routeParams.id}).$promise.then(function (res) {
        scope.user = res;
        if (scope.user.slug === Auth.currentUser().slug) {
          scope.user.allowed = true;
        }
        if (scope.user.role_id === 1 || scope.user.role_id === 2 || scope.user.role_id === 3) {
          scope.user.admin = true;
        }
        formatCurrency();
        scope.loading = undefined;
      });
    };

    scope.save = function(form) {
      form.$setPristine();
      User.update({}, {
        id: scope.user.slug,
        user: scope.user
      }).$promise.then(function(results) {
        showToast(gettextCatalog.getString('User successfully updated.'));
      }, function(err) {
        showErrors(err);
      });
    };

    init();
  };

  return {
    link: link,
    scope: {
      loading: '='
    },
    templateUrl: 'components/users/billing/_index.html'
  };

}]);

app.directive('userSessions', ['User', '$routeParams', '$location', 'pagination_labels', function(User, $routeParams, $location, pagination_labels) {

  var link = function( scope, element, attrs ) {

    scope.options = {
      autoSelect: true,
      boundaryLinks: false,
      largeEditDialog: false,
      pageSelector: false,
      rowSelection: true
    };

    scope.pagination_labels = pagination_labels;
    scope.query = {
      order:      'updated_at',
      limit:      $routeParams.per || 25,
      page:       $routeParams.page || 1,
      options:    [5,10,25,50,100],
      direction:  $routeParams.direction || 'desc'
    };

    scope.onPaginate = function (page, limit) {
      scope.query.page = page;
      scope.query.limit = limit;
      updatePage();
    };

    var updatePage = function(page) {
      var hash            = {};
      hash.page           = scope.query.page;
      hash.per            = scope.query.limit;
      $location.search(hash);
      init();
    };

    var init = function() {
      var params = {page: scope.page, id: $routeParams.id, per: scope.query.limit };
      User.sessions(params).$promise.then(function(results) {
        scope.sessions    = results.sessions;
        scope._links      = results._links;
        scope.loading     = undefined;
      }, function(err) {
        scope.loading = undefined;
      });

    };

    init();

  };

  return {
    link: link,
    scope: {
      loading: '='
    },
    templateUrl: 'components/users/sessions/_index.html'
  };

}]);

app.directive('userLogoutAll', ['User', '$routeParams', '$location', '$mdDialog', 'locationHelper', 'AUTH_URL', 'gettextCatalog', function(User, $routeParams, $location, $mdDialog, locationHelper, AUTH_URL, gettextCatalog) {

  var link = function( scope, element, attrs ) {

    var logout = function() {
      User.logout_all({id: $routeParams.id}).$promise.then(function(results) {
        var sub = locationHelper.subdomain();
        window.location.href = AUTH_URL + '/logout';
      }, function(err) {
      });
    };

    scope.logout = function() {
      var confirm = $mdDialog.confirm()
      .title(gettextCatalog.getString('Logout?'))
      .textContent(gettextCatalog.getString('This will clear all active sessions, including this one.'))
      .ariaLabel(gettextCatalog.getString('Logout'))
      .ok(gettextCatalog.getString('LOGOUT'))
      .cancel(gettextCatalog.getString('Cancel'));
      $mdDialog.show(confirm).then(function() {
        logout();
      }, function() {
      });
    };

  };

  return {
    link: link,
    scope: {
      loading: '='
    },
    templateUrl: 'components/users/sessions/_logout_all.html',
  };

}]);

app.directive('userPassword', ['User', 'Auth', '$routeParams', '$mdDialog', 'showToast', 'showErrors', 'gettextCatalog', '$location', function(User, Auth, $routeParams, $mdDialog, showToast, showErrors, gettextCatalog, $location) {

  var link = function( scope, element, attrs ) {

    var id;
    if ($location.path() === '/me' || Auth.currentUser().slug === $routeParams.id) {
      id = Auth.currentUser().slug;
    } else {
      id = $routeParams.id;
    }

    scope.changePassword = function() {
      $mdDialog.show({
        templateUrl: 'components/users/show/_password.html',
        parent: angular.element(document.body),
        controller: DialogController,
        clickOutsideToClose: true,
        locals: {
        }
      });
    };

    function DialogController($scope) {
      $scope.change = function(user) {
        $mdDialog.cancel();
        change(user);
      };
      $scope.close = function() {
        $mdDialog.cancel();
      };
    }
    DialogController.$inject = ['$scope'];

    var change = function(user) {
      scope.loading = true;
      User.update({
        id: id,
        user: {
          password: user.password,
          current_password: user.current_password
        }
      }).$promise.then(function(results) {
        showToast(gettextCatalog.getString('Password successfully updated.'));
      }, function(err) {
        showErrors(err);
      });

    };

  };

  return {
    link: link,
    scope: {},
    templateUrl: 'components/users/show/_change_password.html',
  };
}]);

app.directive('userQuotas', ['Quota', 'showToast', 'gettextCatalog', 'showErrors', '$routeParams', '$localStorage', '$mdDialog', function(Quota,showToast,gettextCatalog,showErrors,$routeParams,$localStorage,$mdDialog) {

  var link = function( scope, element, attrs ) {

    scope.currentNavItem = 'quotas'

    var init = function() {
      Quota.get({user_id: $routeParams.id}).$promise.then(function(data) {
        scope.quota = data.quota;
        scope.usage = data.usage;
        scope.user = $localStorage.mimo_user;
        scope.loading = undefined;
      });
    };

    scope.editBoxQuota = function() {
      $mdDialog.show({
        templateUrl: 'components/users/quotas/_update_quota.html',
        parent: angular.element(document.body),
        clickOutsideToClose: true,
        locals: {
          quota: scope.quota
        },
        controller: DialogController
      });
    };

    function DialogController ($scope,quota) {
      $scope.quota = quota;
      $scope.close = function() {
        $mdDialog.cancel();
      };
      $scope.save = function() {
        $mdDialog.cancel();
        saveBoxQuota();
      };
    }

    var saveBoxQuota = function(quota) {
      Quota.update({}, {user_id: $routeParams.id, id: scope.quota.id, quota: {boxes: scope.quota.boxes}}).$promise.then(function(data) {
        showToast(gettextCatalog.getString(data.message));
      }, function(errors) {
        showErrors(errors);
      });
    };

    init();
  };

  return {
    link: link,
    scope: {
      loading: '='
    },
    templateUrl: 'components/users/quotas/_index.html'
  };

}]);

app.directive('userNav', ['Location', function(Location) {

  var link = function(scope, element, attrs, controller) {
  };

  return {
    link: link,
    templateUrl: 'components/users/_nav.html'
  };
}]);

app.directive('userUpgradeTrial', ['Auth', 'User', '$routeParams', '$timeout', '$location', '$mdDialog', 'gettextCatalog', function (Auth, User, $routeParams, $timeout, $location, $mdDialog, gettextCatalog) {

  var link = function(scope) {
    var timeout;
    scope.confirmed = false;

    var upgradeTrial = function() {
      User.upgrade_trial({
        secret: $routeParams.secret,
        id: Auth.currentUser().slug
      }).$promise.then(function(results) {
        scope.message = 'Cool, your plan was upgraded. Remember to party hard.';
        scope.confirmed = true;
      }, function(err) {
        scope.message = 'Could not validate the token, please try again later.';
        scope.confirmed = true;
      });
    };

    scope.upgradeTrial = function() {
      if ($routeParams.secret && Auth.currentUser()) {
        upgradeTrial();
      } else {
        $location.path('/');
        $location.search({});
      }
    };
  };

  return {
    link: link,
    scope: {
      loading: '='
    },
    templateUrl: 'components/users/trial/_upgrade_trial.html'
  };
}]);

app.directive('gdprConsent', ['User', 'Auth', '$route', '$routeParams', '$location', '$rootScope', '$timeout', '$mdDialog', '$localStorage', 'showToast', 'showErrors', 'gettextCatalog', function(User, Auth, $route, $routeParams, $location, $rootScope, $timeout, $mdDialog, $localStorage, showToast, showErrors, gettextCatalog) {

  var link = function(scope, element, attrs) {

    scope.confirmDelete = function(email, user) {
      User.destroy({id: user.slug, email: email}).$promise.then(function() {
        Auth.logout();
      }, function(err) {
        showErrors(err);
      });
    };

    function DeleteController($scope, user) {
      $scope.delete = function(email) {
        scope.confirmDelete(email, user);
        $mdDialog.cancel();
      };
      $scope.close = function() {
        $mdDialog.cancel();
      };
    }
    DeleteController.$inject = ['$scope', 'user'];

    var deleteAccount = function(user) {
      $mdDialog.show({
        templateUrl: 'components/users/show/_delete_account.html',
        parent: angular.element(document.body),
        controller: DeleteController,
        locals: {
          user: user
        }
      });
    };

    var save = function(user) {
      User.update({}, {
        id: user.slug,
        user: user
      }, function(data) {
        $localStorage.mimo_user.consented_at = true;
      }, function(err) {
        showErrors(err);
      });
    };

    function DialogController($scope,loading) {
      $scope.user = Auth.currentUser();
      $scope.user.gdpr_consent = undefined;
      $scope.loading = loading;
      $scope.save = function() {
        save($scope.user);
        $mdDialog.cancel();
      };

      $scope.delete_account = function() {
        deleteAccount($scope.user);
        $mdDialog.cancel();
      };
    }

    DialogController.$inject = ['$scope', 'loading'];

    var init = function() {
      $mdDialog.show({
        templateUrl: 'components/users/_gdpr_consent.html',
        parent: angular.element(document.body),
        clickOutsideToClose: false,
        controller: DialogController,
        locals: {
          loading: scope.loading
        }
      });
    };

    init();
  };

  return {
    link: link,
  };
}]);
