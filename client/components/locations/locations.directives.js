'use strict';

var app = angular.module('myApp.locations.directives', []);

app.directive('locationShow', ['Location', '$routeParams', '$location', '$localStorage', 'showToast', 'menu', '$timeout', '$route', '$rootScope', 'gettextCatalog', function(Location, $routeParams, $location, $localStorage, showToast, menu, $timeout, $route, $rootScope, gettextCatalog) {

  var link = function(scope,element,attrs,controller) {

    var channel;

    scope.favourite = function() {
      scope.location.is_favourite = !scope.location.is_favourite;
      updateLocation();
    };

    if ($localStorage.mimo_user) {
      scope.white_label = $localStorage.mimo_user.custom;
    }

    function updateLocation() {
      Location.update({}, {
        id: $routeParams.id,
        location: {
          favourite: scope.location.is_favourite
        }
      }).$promise.then(function(results) {
        var val = scope.location.is_favourite ? gettextCatalog.getString('added to') : gettextCatalog.getString('removed from');
        showToast(gettextCatalog.getString('Location {{val}} favourites.', {val: val}));
      }, function(err) {
      });
    }

    scope.addDevice = function() {
      window.location.href = '/#/locations/' + scope.location.slug + '/boxes/new';
    };

    var timer = $timeout(function() {
      scope.loading = undefined;
      $timeout.cancel(timer);
    },1500);

    controller.fetch().then(function(integration) {
      scope.integration = integration;
    }, function(err) { console.log(err); });

    scope.addBoxes = function() {
      controller.addBoxes(scope.integration).then(function() {
        $route.reload();
      });
    };
  };

  return {
    require: '^integrations',
    link: link,
    loading: '=',
    templateUrl: 'components/locations/show/_index.html'
  };

}]);

app.directive('newLocationForm', ['Location', '$location', 'menu', 'showErrors', 'showToast', '$timeout', 'gettextCatalog', function(Location, $location, menu, showErrors, showToast, $timeout, gettextCatalog) {

  var link = function( scope, element, attrs ) {

    menu.isOpen     = false;
    menu.hideBurger = true;
    scope.location  = {};

    scope.save = function(form, location) {
      form.$setPristine();
      scope.location.creating = true;
      updateCT(location);
    };

    var complete = function(slug) {
      var timer = $timeout(function() {
        $timeout.cancel(timer);
        $location.path('/' + slug + '/guide');
        showToast(gettextCatalog.getString('Location successfully created.'));
      }, 2000);
    };

    var updateCT = function(location) {
      scope.loading = true;
      Location.save({
        location: location,
      }).$promise.then(function(results) {
        menu.isOpen = true;
        menu.hideBurger = false;
        complete(results.slug);
      }, function(err) {
        var msg = err.data.message[0];
        scope.loading = undefined;
        if (msg === 'Over free quota') {
          scope.over_quota = 'Hey, you\'re going to need a paid plan to do that.';
        } else if (msg === 'Over quota') {
          scope.over_quota = 'Please drop us a line and ask for a quota increase.';
        } else {
          showErrors(err);
        }
      });
    };
  };

  return {
    link: link,
    restrict: 'E',
    scope: {
    },
    templateUrl: 'components/locations/new/_index.html'
  };

}]);

app.directive('newLocationCreating', ['Location', '$location', function(Location, $location) {

  var link = function( scope, element, attrs ) {
    scope.locationFinalised = function() {
      scope.location.attr_generated = true;
      $location.path('/locations/' + scope.location.slug);
      scope.newLocationModal();
    };
  };

  return {
    link: link,
    templateUrl: 'components/locations/show/attr-generated.html'
  };

}]);

app.directive('locationBoxes', ['Location', '$location', 'Box', '$routeParams', '$mdDialog', '$mdMedia', 'showToast', 'showErrors', '$q', '$mdEditDialog', '$rootScope', 'gettextCatalog', 'pagination_labels', '$timeout', function(Location, $location, Box, $routeParams, $mdDialog, $mdMedia, showToast, showErrors, $q, $mdEditDialog, $rootScope, gettextCatalog, pagination_labels, $timeout) {

  var link = function( scope, element, attrs, controller ) {
    scope.selected = [];
    scope.location = {
      slug: $routeParams.id
    };

    // User Permissions //
    var createMenu = function() {

      scope.menuItems = [];

      scope.menuItems.push({
        name: gettextCatalog.getString('Delete'),
        type: 'delete',
        icon: 'delete_forever'
      });
    };

    createMenu();

    scope.options = {
      boundaryLinks: false,
      pageSelector: false,
      rowSelection: true
    };

    scope.pagination_labels = pagination_labels;
    scope.query = {
      order:          '-last_heartbeat',
      limit:          $routeParams.per || 25,
      page:           $routeParams.page || 1,
      options:        [5,10,25,50,100],
      direction:      $routeParams.direction || 'desc'
    };

    var removeFromList = function(box) {
      scope.selected = [];
      for (var i = 0, len = scope.boxes.length; i < len; i++) {
        if (scope.boxes[i].id === box.id) {
          if (!scope.selected.length) {
          }
          scope.boxes.splice(i, 1);
          break;
        }
      }
    };

    var deleteBox = function(box) {
      box.processing  = true;
      box.allowed_job = false;
      Box.destroy({id: box.slug}).$promise.then(function(results) {
        removeFromList(box);
      }, function(errors) {
        box.processing  = undefined;
        showToast(gettextCatalog.getString('Failed to delete this box, please try again.'));
        console.log('Could not delete this box:', errors);
      });
    };

    var destroy = function(box,ev) {
      var confirm = $mdDialog.confirm()
        .title(gettextCatalog.getString('Delete This Device Permanently?'))
        .textContent(gettextCatalog.getString('Please be careful, this cannot be reversed.'))
        .ariaLabel(gettextCatalog.getString('Lucky day'))
        .targetEvent(ev)
        .ok(gettextCatalog.getString('Delete it'))
        .cancel(gettextCatalog.getString('Cancel'));
      $mdDialog.show(confirm).then(function() {
        deleteBox(box);
        showToast(gettextCatalog.getString('Deleted device with mac {{address}}', {address: box.calledstationid}));
      });
    };

    scope.action = function(box,type) {
      switch(type) {
        case 'delete':
          destroy(box);
          break;
        default:
      }
    };

    var init = function() {
      scope.deferred = $q.defer();
      Box.query({
        location_id: scope.location.slug,
        page: scope.query.page,
        per:  scope.query.limit,
        metadata: true
      }).$promise.then(function(results) {
        scope.boxes           = results.boxes;
        scope._links          = results._links;
        scope.loading         = undefined;
        scope.deferred.resolve();
      }, function(err) {
        scope.loading = undefined;
      });
      return scope.deferred.promise;
    };

    var search = function() {
      var hash            = {};
      hash.page           = scope.query.page;
      hash.per            = scope.query.limit;
      $location.search(hash);
      init();
    };

    scope.onPaginate = function (page, limit) {
      scope.query.page = page;
      scope.query.limit = limit;
      search();
    };

    controller.fetch().then(function(integration) {
      scope.integration = integration;
    }, function(err) { console.log(err); });

    init();

  };
  return {
    require: '^integrations',
    link: link,
    scope: {
      filter: '=',
      loading: '=',
      token: '@'
    },
    templateUrl: 'components/locations/boxes/_table.html'
  };

}]);

app.directive('locationSettings', ['Location', '$location', '$routeParams', '$mdDialog', 'showToast', 'showErrors', 'moment', 'gettextCatalog', function(Location, $location, $routeParams, $mdDialog, showToast, showErrors, moment, gettextCatalog) {

  var controller = function($scope) {
    this.$scope = $scope;

    var slug;

    // User Permissions //
    var allowedUser = function() {
      $scope.allowed = true;
    };

    var id = $routeParams.id;
    var init = function() {
      $scope.loading  = undefined;
      slug = $scope.location.slug; // used to check for location name change
      allowedUser();
    };

    this.update = function (myform) {
      // Doesn't work since we display the form via a template
      // myform.$setPristine();
      Location.update({}, {
        id: $scope.location.slug,
        location: $scope.location
      }, function(data) {
        if (slug !== data.slug) {
          $location.path('/' + data.slug + '/settings');
        }
        showToast(gettextCatalog.getString('Successfully updated location.'));
      }, function(err) {
        showErrors(err);
      });
    };

    this.back = function() {
      window.location.href = '/#/' + slug + '/settings';
    };

    init();

  };

  controller.$inject = ['$scope'];

  return {
    restrict: 'AE',
    scope: {
      loading: '=',
      location: '='
    },
    controller: controller
  };

}]);

app.directive('locationSettingsMain', ['Location', '$location', '$routeParams', 'moment', '$mdDialog', 'showToast', 'showErrors', 'gettextCatalog', function(Location, $location, $routeParams, moment, $mdDialog, showToast, showErrors, gettextCatalog) {

  var link = function( scope, element, attrs, controller ) {

    scope.timezones = moment.tz.names();
    scope.currentNavItem = 'location';

    scope.update = function (form) {
      controller.update(form);
    };

    scope.back = function() {
      controller.back();
    };

    scope.destroy = function(ev) {
      var confirm = $mdDialog.confirm()
        .title(gettextCatalog.getString('Are you sure you want to delete this location?'))
        .textContent(gettextCatalog.getString('This action cannot be reversed!'))
        .ariaLabel(gettextCatalog.getString('Archive'))
        .targetEvent(ev)
        .ok(gettextCatalog.getString('delete'))
        .cancel(gettextCatalog.getString('Cancel'));
      $mdDialog.show(confirm).then(function() {
        destroyLocation();
      });
    };

    var destroyLocation = function(id) {
      Location.destroy({id: scope.location.id}).$promise.then(function(results) {
        $location.path('/');
        showToast(gettextCatalog.getString('Successfully deleted location.'));
      }, function(err) {
        showErrors(err);
      });
    };

  };

  return {
    link: link,
    templateUrl: 'components/locations/settings/_main.html',
    require: '^locationSettings'
  };

}]);

app.directive('locationSettingsDevices', ['menu', '$timeout', function(menu, $timeout) {

  var link = function( scope, element, attrs, controller ) {

    scope.environments = [{key: 'Beta', value: 'Beta'}, {key: 'Production', value: 'Production'}];

    scope.update = function (form) {
      controller.update(form,scope.location);
    };

    scope.testVsz = function(form) {
      form.$setPristine();
      scope.location.vsg_testing = true;
      scope.location.run_vsg_test = true;
      controller.$scope.update(form,scope.location);
    };

    scope.toggle = function(section) {
      menu.toggleSelectSection(section);
    };

    scope.isOpen = function(section) {
      return menu.isSectionSelected(section);
    };

    scope.back = function() {
      controller.back();
    };

    var timer = $timeout(function() {
      if (scope.location.experimental === true) {
        scope.environments.push({key: 'Experimental', value: 'Experimental' });
      }
      $timeout.cancel(timer);
    }, 250);

  };

  return {
    link: link,
    templateUrl: 'components/locations/settings/_devices.html',
    require: '^locationSettings'
  };

}]);

app.directive('integrationSelect', ['Location', '$routeParams', '$location', '$http', '$mdDialog', 'showToast', 'showErrors', 'gettextCatalog', 'API_URL', function(Location, $routeParams, $location, $http, $mdDialog, showToast, showErrors, gettextCatalog, API_URL) {

  var link = function(scope, element, attrs, controller) {

    scope.loading = true;

    scope.integrations = [ 'unifi' ];
    scope.integrationDetails = { 
      unifi: { 
        image: API_URL + '/manufacturers/ubiquiti-logo.png', 
        name: 'UniFi Controller' 
      } 
    };

    scope.save = function(type) {
      if (scope.location.paid) {
        var msg = 'Integration Selected'
        console.log(msg);
        $location.path($routeParams.id + '/integration/' + type + '/auth');
      }
    };

    controller.fetch().then(function(integration) {
      if (integration && integration.active) {
        $location.path('/' + $routeParams.id + '/settings/integrations');
      } else {
        scope.loading = undefined;
      }
    });
  };

  return {
    require: '^integrations',
    link: link,
    scope: {
      location: '=',
      loading: '='
    },
    templateUrl: 'components/locations/integrations/_create_integration.html'
  };

}]);

app.directive('integrations', ['Location', '$routeParams', '$location', '$http', '$mdDialog', 'showToast', 'showErrors', 'SplashIntegration', '$q', function(Location, $routeParams, $location, $http, $mdDialog, showToast, showErrors, SplashIntegration, $q) {

  var link = function(scope, element, attrs) {
    scope.integSelected = function() {
      scope.integration.host = undefined;
      scope.integration.username = undefined;
      scope.integration.password = undefined;
    };
  };

  var controller = function($scope) {

    this.scope = $scope;

    this.fetch = function() {
      var deferred = $q.defer();
      SplashIntegration.query({location_id: $routeParams.id}).$promise.then(function(results) {
        deferred.resolve(results);
      });
      return deferred.promise;
    };

    this.save = function(integration) {
      var deferred = $q.defer();
      SplashIntegration.create({}, {
        location_id: $routeParams.id,
        splash_integration: integration
      }).$promise.then(function(results) {
        showToast('Successfully validated integration');
        deferred.resolve(results);
      }, function(error) {
        deferred.reject();
        showErrors(error);
      });

      return deferred.promise;
    };

    this.destroy = function(integration) {
      var deferred = $q.defer();
      SplashIntegration.destroy({}, {
        id: integration.id,
        location_id: $routeParams.id,
      }).$promise.then(function(results) {
        showToast('Successfully deleted integration');
        deferred.resolve(results);
      }, function(error) {
        deferred.reject(error);
        showErrors(error);
      });
      return deferred.promise;
    };

    this.update = function(integration) {
      var deferred = $q.defer();
      SplashIntegration.update({}, {
        id: integration.id,
        location_id: $routeParams.id,
        splash_integration: integration
      }).$promise.then(function(results) {
        showToast('Successfully updated and validated integration');
        deferred.resolve(results);
      }, function(error) {
        deferred.reject(error);
        showErrors(error);
      });
      return deferred.promise;
    };

    this.fetchSites = function(integration) {
      var deferred = $q.defer();
      SplashIntegration.integration_action({
        id: integration.id,
        location_id: $routeParams.id,
        action: 'fetch_settings'
      }).$promise.then(function(results) {
        deferred.resolve(results);
      });
      return deferred.promise;
    };

    this.addBoxes = function(integration) {
      var deferred = $q.defer();
      SplashIntegration.update({},{
        id: integration.id,
        location_id: $routeParams.id,
        splash_integration: {
          action: 'import_boxes'
        }
      }, function(results) {
        if (results.success > 0) {
          showToast(results.success + ' boxes imported. ' + results.failed.length + ' failed to import (added to another location).');
          deferred.resolve();
        } else if (results.success === 0 && results.failed === 0) {
          showToast('Couldn\'nt import any boxes!!!');
          deferred.reject();
        } else if (results.success === 0 ) {
          showToast(results.failed.length + ' boxes failed to import - already added to a location.');
          deferred.reject();
        }
      }, function(error) {
        showErrors(error);
        deferred.reject();
      });
      return deferred.promise;
    };
  };

  return {
    controller: controller
  };

}]);

app.directive('cloudtraxAuth', ['Location', '$routeParams', '$location', '$http', '$mdDialog', 'showToast', 'showErrors', 'gettextCatalog', function(Location, $routeParams, $location, $http, $mdDialog, showToast, showErrors, gettextCatalog) {

  var link = function(scope, element, attrs, controller) {

    scope.location = {slug: $routeParams.id};

    var locationName = function() {
      Location.get({id: scope.location.slug}, function(data) {
        scope.location = data;
      }, function(err){
        console.log(err);
      });
    };

    var create = function() {
      controller.save(scope.integration).then(function() {
        var msg = 'Integration Validated';
        console.log(msg);
        scope.validated = true;
      });
    };

    var update = function() {
      controller.update(scope.integration).then(function() {
        scope.validated = true;
      }, function(error) {
        // console.log(error)
        // showErrors(error);
      });
    };

    scope.save = function(form) {
      scope.myForm.$setPristine();
      scope.integration.action = 'validate';
      if (scope.integration.new_record) {
        create();
      } else {
        update();
      }
    };

    scope.next = function(results) {
      $location.path($routeParams.id + '/integration/cloudtrax/setup');
    };

    scope.back = function(results) {
      $location.path($routeParams.id + '/integration');
    };

    controller.fetch().then(function(integration) {
      scope.integration = integration;
      if (integration && integration.active) {
        $location.path('/' + $routeParams.id + '/settings/integrations');
        return;
      }
      scope.integration.type = 'cloudtrax';
    }, function(err) { console.log(err); });

    locationName();

  };

  return {
    require: '^integrations',
    link: link,
    scope: {},
    templateUrl: 'components/locations/integrations/_cloudtrax_auth.html'
  };

}]);

app.directive('cloudtraxSetup', ['Location', '$routeParams', '$location', '$http', '$mdDialog', 'showToast', 'showErrors', 'gettextCatalog', 'SplashIntegration', '$route', '$timeout', function(Location, $routeParams, $location, $http, $mdDialog, showToast, showErrors, gettextCatalog, SplashIntegration, $route, $timeout) {

  var link = function(scope, element, attrs, controller) {

    scope.loading = true;
    scope.location = {slug: $routeParams.id};
    scope.ct = { };

    var locationName = function() {
      Location.get({id: scope.location.slug}, function(data) {
        scope.location = data;
      }, function(err){
        console.log(err);
      });
    };

    var fetchSites = function() {
      controller.fetchSites(scope.integration).then(function(sites) {
        var timer = $timeout(function() {
          scope.loading = undefined;
          scope.cloudtrax_networks = sites;
          $timeout.cancel(timer);
        },1500);
      });
    };

    scope.save = function(form) {
      scope.myForm.$setPristine();
      // site = JSON.parse(site);
      SplashIntegration.update({},{
        id: scope.integration.id,
        location_id: $routeParams.id,
        splash_integration: {
          metadata: {
            ssid: scope.ct.ssid
          },
          action: 'create_setup'
        }
      }, function(results) {
        showToast('Successfully created UniFi setup');
        // @zak create the landing page
        $location.path($routeParams.id + '/integration/completed');
      }, function(error) {
        showErrors(error);
      });
    };

    var fetchSsids = function() {
      SplashIntegration.integration_action({
        id: scope.integration.id,
        location_id: $routeParams.id,
        action: 'cloudtrax_ssids'
      }).$promise.then(function(results) {
        scope.cloudtrax_ssids = results;
      }
      );
    };

    // Actually create a cloudtrax network - only called if no networks
    scope.createNetwork = function(form, network) {
      scope.myForm.$setPristine();
      SplashIntegration.update({},{
        id: scope.integration.id,
        location_id: $routeParams.id,
        splash_integration: {
          metadata: {
            network: scope.ct.network_name
          },
          action: 'create_network'
        }
      }, function(results) {
        showToast('Successfully created network');
        $route.reload();
      }, function(error) {
        showErrors(error);
      });
    };

    scope.saveNetworkID = function(id) {
      SplashIntegration.update({},{
        id: scope.integration.id,
        location_id: $routeParams.id,
        splash_integration: {
          metadata: {
            network: id
          }
        }
      }, function(results) {
        fetchSsids();
      }, function(error) {
        showErrors(error);
      });
    };

    scope.finalise = function() {
      var ssid = JSON.parse(scope.ct.ct_ssid);
      scope.myForm.$setPristine();
      SplashIntegration.update({},{
        id: scope.integration.id,
        location_id: $routeParams.id,
        splash_integration: {
          metadata: {
            ssid:    scope.ct.ssid,
            ssid_id: ssid.id
          },
          action: 'create_setup'
        }
      }, function(results) {
        showToast('Successfully enabled network');
        $location.path($routeParams.id + '/integration/completed');
      }, function(error) {
        showErrors(error);
      });
    };

    scope.setSsid = function() {
      scope.ct.ssid = JSON.parse(scope.ct.ct_ssid).ssid;
    };

    controller.fetch().then(function(integration) {
      if(integration.new_record) {
        $location.path($routeParams.id + '/integration/cloudtrax/auth');
      } else if (integration.active) {
        $location.path('/' + $routeParams.id + '/settings/integrations');
      } else {
        var msg = 'Integration Settings';
        console.log(msg);
        scope.integration = integration;
        fetchSites();
      }
    });

    locationName();

  };

  return {
    require: '^integrations',
    link: link,
    scope: {},
    templateUrl: 'components/locations/integrations/_cloudtrax_setup.html'
  };

}]);
app.directive('unifiAuth', ['Location', '$routeParams', '$location', '$http', '$mdDialog', 'showToast', 'showErrors', 'gettextCatalog', function(Location, $routeParams, $location, $http, $mdDialog, showToast, showErrors, gettextCatalog) {

  var link = function(scope, element, attrs, controller) {

    scope.location = {slug: $routeParams.id};

    var locationName = function() {
      Location.get({id: scope.location.slug}, function(data) {
        scope.location = data;
      }, function(err){
        console.log(err);
      });
    };

    var create = function() {
      controller.save(scope.integration).then(function() {
        var msg = 'Integration Validated';
        console.log(msg);
        scope.validated = true;
      });
    };

    var update = function() {
      controller.update(scope.integration).then(function() {
        scope.validated = true;
      });
    };

    scope.save = function(form) {
      scope.myForm.$setPristine();
      scope.integration.action = 'validate';
      if (scope.integration.new_record) {
        create();
      } else {
        update();
      }
    };

    scope.next = function(results) {
      $location.path($routeParams.id + '/integration/unifi/setup');
    };

    scope.back = function(results) {
      $location.path($routeParams.id + '/integration');
    };

    controller.fetch().then(function(integration) {
      scope.integration = integration;
      if (integration && integration.active) {
        $location.path('/' + $routeParams.id + '/settings/integrations');
        return;
      }
      scope.integration.integration_type = 'unifi';
    }, function(err) { console.log(err); });

    locationName();

  };

  return {
    require: '^integrations',
    link: link,
    scope: {},
    templateUrl: 'components/locations/integrations/_unifi_auth.html'
  };

}]);

app.directive('unifiSetup', ['Location', '$routeParams', '$location', '$http', '$mdDialog', 'showToast', 'showErrors', 'gettextCatalog', 'SplashIntegration', function(Location, $routeParams, $location, $http, $mdDialog, showToast, showErrors, gettextCatalog, SplashIntegration) {

  var link = function(scope, element, attrs, controller) {

    scope.location = {slug: $routeParams.id};

    var locationName = function() {
      Location.get({id: scope.location.slug}, function(data) {
        scope.location = data;
      }, function(err){
        console.log(err);
      });
    };

    scope.save = function(form,site,ssid) {
      scope.myForm.$setPristine();
      site = JSON.parse(site);
      SplashIntegration.update({},{
        id: scope.integration.id,
        location_id: $routeParams.id,
        splash_integration: {
          metadata: {
            unifi_site_name:  site.name,
            unifi_site_id:    site.id,
            ssid:             ssid
          },
          action: 'create_setup'
        }
      }, function(results) {
        showToast('Successfully created UniFi setup');
        // @zak create the landing page
        $location.path($routeParams.id + '/integration/completed');
      }, function(error) {
        showErrors(error);
      });
    };

    var fetchSites = function() {
      controller.fetchSites(scope.integration).then(function(sites) {
        scope.unifi_sites = sites;
      });
    };

    controller.fetch().then(function(integration) {
      if(integration.new_record) {
        $location.path($routeParams.id + '/integration/unifi/auth');
      } else if (integration.active) {
        $location.path('/' + $routeParams.id + '/settings/integrations');
      } else {
        var msg = 'Integration Settings';
        console.log(msg);
        scope.integration = integration;
        fetchSites();
      }
    });

    locationName();

  };

  return {
    require: '^integrations',
    link: link,
    scope: {},
    templateUrl: 'components/locations/integrations/_unifi_setup.html'
  };

}]);

app.directive('vszAuth', ['Location', '$routeParams', '$location', '$http', '$mdDialog', 'showToast', 'showErrors', 'gettextCatalog', function(Location, $routeParams, $location, $http, $mdDialog, showToast, showErrors, gettextCatalog) {

  var link = function(scope, element, attrs, controller) {

    scope.location = {slug: $routeParams.id};

    var locationName = function() {
      Location.get({id: scope.location.slug}, function(data) {
        scope.location = data;
      }, function(err){
        console.log(err);
      });
    };

    var create = function() {
      controller.save(scope.integration).then(function() {
        var msg = 'Integration Validated';
        console.log(msg);
        scope.validated = true;
      });
    };

    var update = function() {
      controller.update(scope.integration).then(function() {
        scope.validated = true;
      });
    };

    scope.save = function(form) {
      scope.myForm.$setPristine();
      scope.integration.action = 'validate';
      if (scope.integration.new_record) {
        create();
      } else {
        update();
      }
    };

    scope.next = function(results) {
      $location.path($routeParams.id + '/integration/vsz/setup');
    };

    scope.back = function(results) {
      $location.path($routeParams.id + '/integration');
    };

    controller.fetch().then(function(integration) {
      if (integration.active) {
        $location.path('/' + $routeParams.id + '/settings/integrations');
      }
      scope.integration = integration;
      scope.integration.integration_type = 'vsz';
    }, function(err) { console.log(err); });

    locationName();

  };

  return {
    require: '^integrations',
    link: link,
    scope: {
    },
    templateUrl: 'components/locations/integrations/_vsz_auth.html'
  };

}]);

app.directive('vszSetup', ['Location', '$routeParams', '$location', '$http', '$mdDialog', 'showToast', 'showErrors', 'gettextCatalog', 'SplashIntegration', function(Location, $routeParams, $location, $http, $mdDialog, showToast, showErrors, gettextCatalog, SplashIntegration) {

  var link = function(scope, element, attrs, controller) {

    scope.location = {slug: $routeParams.id};

    var locationName = function() {
      Location.get({id: scope.location.slug}, function(data) {
        scope.location = data;
      }, function(err){
        console.log(err);
      });
    };

    scope.save = function(form,site,ssid) {
      scope.myForm.$setPristine();
      site = JSON.parse(site);
      SplashIntegration.update({},{
        id: scope.integration.id,
        location_id: $routeParams.id,
        splash_integration: {
          metadata: {
            vsz_zone_name:  site.name,
            zoneUUID:       site.id,
            ssid:           ssid
          },
          action: 'create_setup'
        }
      }, function(results) {
        showToast('Successfully created Ruckus VSZ setup');
        console.log(results);
        // @zak create the landing page
        $location.path($routeParams.id + '/integration/completed');
      }, function(error) {
        showErrors(error);
      });
    };

    var fetchSites = function() {
      controller.fetchSites(scope.integration).then(function(sites) {
        scope.vsz_zones = sites;
      });
    };

    controller.fetch().then(function(integration) {
      if(integration.new_record) {
        $location.path($routeParams.id + '/integration/vsz/auth');
      } else if (integration.active) {
        $location.path('/' + $routeParams.id + '/settings/integrations');
      } else {
        var msg = 'Integration Settings';
        console.log(msg);
        scope.integration = integration;
        fetchSites();
      }
    });

    locationName();

  };

  return {
    require: '^integrations',
    link: link,
    scope: {
    },
    templateUrl: 'components/locations/integrations/_vsz_setup.html'
  };

}]);

app.directive('merakiAuth', ['Location', '$routeParams', '$location', '$http', '$mdDialog', 'showToast', 'showErrors', 'gettextCatalog', function(Location, $routeParams, $location, $http, $mdDialog, showToast, showErrors, gettextCatalog) {

  var link = function(scope, element, attrs, controller) {

    scope.location = {slug: $routeParams.id};

    var locationName = function() {
      Location.get({id: scope.location.slug}, function(data) {
        scope.location = data;
      }, function(err){
        console.log(err);
      });
    };

    var create = function() {
      controller.save(scope.integration).then(function() {
        var msg = 'Integration Validated';
        console.log(msg);
        scope.validated = true;
      });
    };

    var update = function() {
      controller.update(scope.integration).then(function() {
        scope.validated = true;
      });
    };

    scope.save = function(form) {
      scope.myForm.$setPristine();
      scope.integration.action = 'validate';
      if (scope.integration.new_record) {
        create();
      } else {
        update();
      }
    };

    scope.next = function(results) {
      $location.path($routeParams.id + '/integration/meraki/setup');
    };

    scope.back = function(results) {
      $location.path($routeParams.id + '/integration');
    };

    controller.fetch().then(function(integration) {
      scope.integration = integration;
      scope.integration.integration_type = 'meraki';
    }, function(err) { console.log(err); });

    locationName();

  };

  return {
    require: '^integrations',
    link: link,
    scope: {
    },
    templateUrl: 'components/locations/integrations/_meraki_auth.html'
  };

}]);

app.directive('merakiSetup', ['Location', '$routeParams', '$location', '$http', '$mdDialog', 'showToast', 'showErrors', 'gettextCatalog', 'SplashIntegration', function(Location, $routeParams, $location, $http, $mdDialog, showToast, showErrors, gettextCatalog, SplashIntegration) {

  var link = function(scope, element, attrs, controller) {

    scope.location = {slug: $routeParams.id};

    var locationName = function() {
      Location.get({id: scope.location.slug}, function(data) {
        scope.location = data;
      }, function(err){
        console.log(err);
      });
    };

    scope.save = function(meraki) {
      SplashIntegration.update({},{
        id: scope.integration.id,
        location_id: $routeParams.id,
        splash_integration: {
          metadata: {
            ssid:         meraki.ssid,
            organisation: scope.meraki.org,
            network:      scope.meraki.network
          },
          action: 'create_setup'
        }
      }, function(results) {
        showToast('Successfully created Meraki setup');
        $location.path('/' + $routeParams.id + '/integration/completed');
      }, function(error) {
        showErrors(error);
      });
    };

    var update = function(cb) {
      SplashIntegration.update({}, {
        id: scope.integration.id,
        location_id: $routeParams.id,
        splash_integration: scope.integration
      }).$promise.then(function(results) {
        return cb();
      }, function(error) {
        console.log(error);
        return cb();
      });
    };

    var fetchSites = function() {
      controller.fetchSites(scope.integration).then(function(results) {
        scope.meraki = {};
        scope.integration.metadata = {};
        scope.meraki.ssid = undefined;
        scope.meraki_ssids = [];
        scope.meraki.network = undefined;
        scope.meraki_networks = [];
        scope.meraki_orgs = results;
      });
    };

    var fetchNetworks = function() {
      SplashIntegration.integration_action({
        id: scope.integration.id,
        location_id: $routeParams.id,
        action: 'meraki_networks'
      }).$promise.then(function(results) {
        scope.meraki_networks = results;
        }
      );
    };

    scope.orgSelected = function(org) {
      scope.meraki.ssid = undefined;
      scope.meraki_ssids = [];
      scope.meraki.network = undefined;
      scope.meraki_networks = [];
      scope.integration.metadata.organisation = org;
      update(function() {
        fetchNetworks();
      });
    };

    var fetchSsid = function() {
      SplashIntegration.integration_action({
        id: scope.integration.id,
        location_id: $routeParams.id,
        action: 'meraki_ssids'
      }).$promise.then(function(results) {
        scope.meraki_ssids = results;
        }
      );
    };

    scope.netSelected = function(network) {
      scope.meraki.ssid = undefined;
      scope.meraki_ssids = [];
      scope.integration.metadata.network = network;
      update(function() {
        fetchSsid();
      });
    };

    controller.fetch().then(function(integration) {
      if(integration.new_record) {
        $location.path($routeParams.id + '/integration/meraki/auth');
      } else if (integration.active) {
        $location.path('/' + $routeParams.id + '/settings/integrations');
      } else {
        var msg = 'Integration Settings';
        console.log(msg);
        scope.integration = integration;
        fetchSites();
      }
    });

    locationName();

  };

  return {
    require: '^integrations',
    link: link,
    scope: {
    },
    templateUrl: 'components/locations/integrations/_meraki_setup.html'
  };

}]);

app.directive('gettingStarted', ['Location', '$routeParams', '$location', '$http', '$mdDialog', 'showToast', 'showErrors', 'gettextCatalog', function(Location, $routeParams, $location, $http, $mdDialog, showToast, showErrors, gettextCatalog) {

  var link = function(scope, element, attrs, controller) {

    scope.loading = true;

    scope.visitSplash = function(paid) {
      $location.path('/' + scope.location.slug + '/splash_pages' + (paid ? '' : '/guide'));
    };
    scope.currentNavItem = 'guide';

    scope.integrationClick = function(type) {
      var msg = 'Wizard Clicked';
      console.log(msg);
    };

    scope.$watch('location',function(nv){
      if (nv !== undefined && scope.location.setup) {
        if (scope.location.setup && scope.location.setup.splash && scope.location.setup.integrations && scope.location.paid) {
          $location.path('/' + scope.location.slug);
        } else {
          scope.loading = undefined;
        }
      }
    });
  };

  return {
    link: link,
    scope: {
      location: '='
    },
    templateUrl: 'components/locations/welcome/_index.html'
  };

}]);

app.directive('integrationComplete', ['Location', '$routeParams', '$location', '$http', '$mdDialog', 'showToast', 'showErrors', 'gettextCatalog', function(Location, $routeParams, $location, $http, $mdDialog, showToast, showErrors, gettextCatalog) {

  var link = function(scope, element, attrs, controller) {

    scope.loading = true;
    scope.location = { slug: $routeParams.id };
    scope.currentNavItem = 'integrations';

    controller.fetch().then(function(integration) {
      scope.integration = integration;
      var msg = 'Integration Complete';
      console.log(msg);
      scope.loading = undefined;
    }, function(err) { console.log(err); });
  };

  return {
    require: '^integrations',
    link: link,
    scope: {
      loading: '='
    },
    templateUrl: 'components/locations/integrations/_integration_complete.html'
  };
}]);

app.directive('integrationSettings', ['Location', '$routeParams', '$location', '$http', '$mdDialog', 'showToast', 'showErrors', 'gettextCatalog', function(Location, $routeParams, $location, $http, $mdDialog, showToast, showErrors, gettextCatalog) {

  var link = function(scope, element, attrs, controller) {

    scope.location = {slug: $routeParams.id};
    scope.currentNavItem = 'integrations';

    scope.openDoc = function(){
      window.open('http://google.com');
    };

    var locationName = function() {
      Location.get({id: scope.location.slug}, function(data) {
        scope.location = data;
      }, function(err){
        console.log(err);
      });
    };

    var create = function() {
      controller.save(scope.integration).then(function() {
        scope.validated = true;
      });
    };

    var update = function() {
      controller.update(scope.integration).then(function() {
        scope.validated = true;
      });
    };

    scope.destroy = function() {
      if (confirm("Are you sure you want to delete this integration?")) {
        var msg = 'Integration Deleted';
        console.log(msg);
        controller.destroy(scope.integration).then(function() {
          scope.integration = {};
        });
      }
    };

    scope.save = function(form) {
      scope.myForm.$setPristine();
      scope.integration.action = 'validate';
      if (scope.integration.new_record) {
        create();
      } else {
        update();
      }
    };

    controller.fetch().then(function(integration) {
      scope.integration = integration;
    }, function(err) { console.log(err); });

    locationName();

  };

  return {
    require: '^integrations',
    link: link,
    scope: {
    },
    templateUrl: 'components/locations/settings/_integration.html'
  };

}]);

app.directive('locationSettingsNav', ['Location', function(Location) {

  var link = function(scope, element, attrs, controller) {
    scope.loading = true;
  };

  return {
    link: link,
    templateUrl: 'components/locations/settings/_nav.html'
  };
}]);

app.directive('locationAudit', ['Session', 'Email', 'Location', 'Report', 'Social', 'SMSLog', '$routeParams', '$rootScope', '$location', '$timeout', '$q', '$localStorage', 'Locations', '$mdDialog', 'showToast', 'showErrors', 'gettextCatalog', function(Session, Email, Location, Report, Social, SMSLog, $routeParams, $rootScope, $location, $timeout, $q, $localStorage, Locations, $mdDialog, showToast, showErrors, gettextCatalog) {

  var link = function(scope,element,attrs,controller) {

    var params = {};

    scope.startDate = moment().utc().subtract(6, 'days').startOf('day').toDate();
    scope.endDate = moment().utc().toDate();

    var weekAgoEpoch = Math.floor(scope.startDate.getTime() / 1000);
    var nowEpoch = Math.floor(scope.endDate.getTime() / 1000);

    scope.audit_models = ['Radius Sessions', 'Emails', 'Social', 'SMS logs'];
    scope.loading = true;

    var mailerType = {
      'Radius Sessions': 'radius',
      'Emails': 'email',
      'Social': 'social',
      'SMS logs': 'sms_log'
    };

    scope.selected = 'Radius Sessions' || $routeParams.type;

    scope.query = {
      page: $routeParams.page || 1,
      limit: $routeParams.per || 25,
      start: $routeParams.start || weekAgoEpoch,
      end: $routeParams.end || nowEpoch
    };

    var getParams = function() {
      params = {
        location_id: scope.location.slug,
        page: scope.query.page,
        per: scope.query.limit,
        start: scope.query.start,
        end: scope.query.end,
        interval: 'day'
      };
    };

    var clearTable = function() {
      scope.results = [];
      scope.links = undefined;
      scope.loading = undefined;
      $location.search();
      if (scope.query.end - scope.query.start > 604800 && $localStorage.user && !localStorage.user.paid_plan) {
        showToast(gettextCatalog.getString('Please ensure you are permitted to see audits in this date range.'));
      }
    };

    var findSessions = function() {
      getParams();
      params.client_mac = scope.query.client_mac;
      Session.query(params).$promise.then(function(data, err) {
        scope.selected = 'Radius Sessions';
        scope.results = data.sessions;
        scope.links = data._links;
        scope.loading = undefined;
        $location.search();
      }, function(err) {
        console.log(err);
        clearTable();
      });
    };

    var findEmails = function() {
      getParams();
      Email.get(params).$promise.then(function(data, err) {
        scope.selected = 'Emails';
        scope.results = data.emails;
        scope.links = data._links;
        scope.loading = undefined;
        $location.search();
      }, function(err) {
        console.log(err);
        clearTable();
      });
    };

    var findSocial = function() {
      getParams();
      Social.get(params).$promise.then(function(data, err) {
        scope.selected = 'Social';
        scope.results = data.social;
        scope.links = data._links;
        $location.search();
        scope.loading = undefined;
      }, function(err) {
        console.log(err);
        clearTable();
      });
    };

    var findSMSLog = function() {
      getParams();
      params.location_id = scope.location.slug;
      SMSLog.get(params).$promise.then(function(data, err) {
        scope.selected = 'SMS logs';
        scope.results = data.logs;
        scope.links = data._links;
        $location.search();
        scope.loading = undefined;
      }, function(err) {
        console.log(err);
        clearTable();
      });
    };

    var downloadReport = function() {
      var params = {
        start: scope.query.start,
        end: scope.query.end,
        location_id: scope.location.id,
        type: mailerType[scope.selected]
      };
      Report.create(params).$promise.then(function(results) {
        showToast(gettextCatalog.getString('Your report will be emailed to you soon'));
      }, function(err) {
        showErrors(err);
      });
    };

    scope.updateAudit = function(selected) {
      scope.loading = true;
      switch(selected) {
        case 'Emails':
          findEmails();
          break;
        case 'Social':
          findSocial();
          break;
        case 'SMS logs':
          findSMSLog();
          break;
        default:
          findSessions();
          break;
      }
    };

    scope.setStart = function() {
      scope.query.start = new Date(scope.startDate).getTime() / 1000;
      scope.updateAudit(scope.selected);
    };

    scope.setEnd = function() {
      scope.query.end = new Date(scope.endDate).getTime() / 1000;
      scope.updateAudit(scope.selected);
    };

    scope.filterSessionsByClient = function(mac) {
      scope.query.client_mac = mac;
      findSessions();
    };

    scope.clearClientFilter = function() {
      scope.query.client_mac = undefined;
      findSessions();
    };

    scope.onPaginate = function(page, limit) {
      scope.query.page = page;
      scope.query.limit = limit;
      scope.updateAudit(scope.selected);
    };

    scope.downloadAudit = function() {
      var confirm = $mdDialog.confirm()
      .title(gettextCatalog.getString('Download Report'))
      .textContent(gettextCatalog.getString('Please note this is a beta feature. Reports are sent via email.'))
      .ariaLabel(gettextCatalog.getString('Email Report'))
      .ok(gettextCatalog.getString('Download'))
      .cancel(gettextCatalog.getString('Cancel'));
      $mdDialog.show(confirm).then(function() {
        downloadReport();
      });
    };

    var getLocation = function() {
      var deferred = $q.defer();
      Location.get({id: $routeParams.id}).$promise.then(function(results) {
        scope.location = results;
        deferred.resolve(results.results);
      }, function() {
        deferred.reject();
      });
      return deferred.promise;
    };

    var init = function() {
      getLocation().then(function() {
        getParams();
        scope.updateAudit(scope.selected);
      });
    };

    init();

  };

  return {
    link: link,
    scope: {
    },
    templateUrl: 'components/locations/audit/_index.html'
  };

}]);
