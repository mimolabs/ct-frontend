'use strict';

var app = angular.module('myApp.boxes.directives', []);

app.directive('showBox', ['Location', 'Box', '$routeParams', 'Auth', '$location', '$mdBottomSheet', 'Zone', 'ZoneListing', '$cookies', 'showToast', 'showErrors', '$mdDialog', '$q', 'ClientDetails', '$timeout', '$rootScope', 'Report', 'menu', 'gettextCatalog', function(Location, Box, $routeParams, Auth, $location, $mdBottomSheet, Zone, ZoneListing, $cookies, showToast, showErrors, $mdDialog, $q, ClientDetails, $timeout, $rootScope, Report, menu, gettextCatalog) {

  var link = function(scope,attrs,element,controller) {

    var prefs = {};
    var timeout;
    var j = 0;
    var counter = 0;

    scope.zone             = ZoneListing;
    scope.location         = { slug: $routeParams.id };
    scope.period           = $routeParams.period || '6h';

    Location.get({id: $routeParams.id}, function(data) {
      scope.location = data;
    }, function(err){
      console.log(err);
    });

    scope.setPrefs = function(a) {
      if (prefs[scope.box.slug] === undefined) {
        prefs[scope.box.slug] = {};
      }
      var expireDate = new Date();
      expireDate.setDate(expireDate.getDate() + 1);
      prefs[scope.box.slug].igz = true;
      $cookies.put('_ctapref', JSON.stringify(prefs), {'expires': expireDate});
    };

    var c = $cookies.get('_ctapref');
    var ignoreZone;
    if ( c !== undefined ) {
      prefs = JSON.parse(c);
      if ( prefs[$routeParams.box_id] ) {
        ignoreZone = prefs[$routeParams.box_id].igz;
      }
    }

    // User Permissions //

    scope.allowed = true;

    scope.menuAction = function(type) {
      switch(type) {
        case 'edit':
          editBox();
          break;
        case 'reboot':
          scope.rebootBox();
          break;
        case 'transfer':
          scope.transferBox();
          break;
        case 'payloads':
          scope.payloads();
          break;
        case 'operations':
          viewOperations();
          break;
        case 'changelog':
          viewHistory();
          break;
        case 'logging':
          logs();
          break;
        case 'reset':
          scope.resetBox();
          break;
        case 'delete':
          scope.deleteBox();
          break;
      }
    };

    var createMenu = function() {
      scope.menu = [];
      scope.menu.push({
        type: 'edit',
        name: gettextCatalog.getString('Edit'),
        icon: 'settings'
      });

      if (scope.box.is_cucumber) {
        scope.menu.push({
          name: gettextCatalog.getString('Reboot'),
          icon: 'autorenew',
          type: 'reboot',
          disabled: !scope.box.allowed_job
        });

        scope.menu.push({
          type: 'payloads',
          name: gettextCatalog.getString('Payloads'),
          icon: 'present_to_all',
        });

        scope.menu.push({
          type: 'changelog',
          name: gettextCatalog.getString('Changelog'),
          icon: 'history',
        });
      }

      scope.menu.push({
        name: gettextCatalog.getString('Transfer'),
        icon: 'transform',
        type: 'transfer',
      });

      if (scope.box.v === '4') {
        scope.menu.push({
          name: gettextCatalog.getString('Operations'),
          icon: 'access_time',
          type: 'operations',
        });
      }

      if (scope.box.is_cucumber) {
        scope.menu.push({
          name: gettextCatalog.getString('Logs'),
          icon: 'library_books',
          type: 'logging',
        });

        scope.menu.push({
          name: gettextCatalog.getString('Reset'),
          icon: 'clear',
          type: 'reset',
        });
      }

      scope.menu.push({
        name: gettextCatalog.getString('Delete'),
        icon: 'delete_forever',
        type: 'delete'
      });
    };

    var logs = function() {
      window.location.href = '/#/' + scope.location.slug + '/logs?ap_mac=' + scope.box.calledstationid;
    };

    var checkZones = function(results) {
      scope.not_in_zone = (results._info && results._info.total > 0);
    };

    // showResetConfirm confirms or cancels a manual reset from a box.
    // Sending true to resetBox will reset.
    // Sending null to resetBox will cancel any actions on box.
    var showResetConfirm = function() {
      $mdBottomSheet.show({
        templateUrl: 'components/boxes/show/_toast_reset_confirm.html',
        controller: ResetCtrl
      });
    };

    function ResetCtrl($scope) {
      $scope.reset = function() {
        $mdBottomSheet.hide();
        resetBox(true);
      };
      $scope.cancel = function() {
        $mdBottomSheet.hide();
        resetBox();
      };
    }
    ResetCtrl.$inject = ['$scope'];

    var showZoneAlert = function() {
      $mdBottomSheet.show({
        templateUrl: 'components/boxes/show/_toast_zone.html',
        locals: {
          prefs: scope.setPrefs
        },
        controller: ZoneAlertCtrl
      });
    };

    var ZoneAlertCtrl = function($scope, $mdBottomSheet, prefs) {
      $scope.add = function() {
        $mdBottomSheet.hide();
        $location.path('/' + scope.location.slug + '/zones').search({ap_mac: scope.box.calledstationid, box_id: scope.box.id});
      };
      $scope.cancel = function() {
        prefs();
        $mdBottomSheet.hide();
      };
    };
    ZoneAlertCtrl.$inject = ['$scope','$mdBottomSheet','prefs'];

    var editBox = function() {
      $location.path('/' + scope.location.slug + '/devices/' + scope.box.slug + '/edit');
    };

    scope.payloads = function() {
      $location.path('/' + scope.location.slug + '/devices/' + scope.box.slug + '/payloads');
    };

    scope.resetBox = function(ev) {
      var confirm = $mdDialog.confirm()
      .title(gettextCatalog.getString('Reset this Device'))
      .textContent(gettextCatalog.getString('Resetting your box is not recommended. If you are having problems with it, please resync first. If the device is offline, it will reset next time it restarts.'))
      .ariaLabel(gettextCatalog.getString('Reset Device'))
      .targetEvent(ev)
      .ok(gettextCatalog.getString('Reset it'))
      .cancel(gettextCatalog.getString('Cancel'));
      $mdDialog.show(confirm).then(function() {
        resetBox(true);
      });
    };

    var resetBox = function(reset) {
      var action = 'reset';
      if (reset === true) {
        scope.resetting = true;
        scope.box.allowed_job = false;
        createMenu();
      } else {
        action = 'cancel';
      }

      Box.update({}, {
        id: scope.box.slug,
        box: { action: action }
      }).$promise.then(function(results) {
        if (action === 'reset') {
          showToast(gettextCatalog.getString('Device reset in progress, please wait.'));
          scope.box.allowed_job = false;
          scope.box.state       = 'new';
          scope.resetting       = undefined;
        }
      }, function(errors) {
        var err;
        if (errors && errors.data && errors.data.errors && errors.data.errors.base) {
          err = errors.data.errors.base;
        } else {
          err = gettextCatalog.getString('Could not reset this device, please try again');
        }
        console.log(errors);
        showToast(err);
        scope.box.state = 'failed';
        scope.resetting = undefined;
      });
    };

    scope.rebootBox = function(ev) {
      var confirm = $mdDialog.confirm()
      .title(gettextCatalog.getString('Would you like to reboot this device?'))
      .textContent(gettextCatalog.getString('Rebooting will disconnect your clients.\nA reboot takes about 60 seconds to complete'))
      .ariaLabel(gettextCatalog.getString('Reboot Box'))
      .targetEvent(ev)
      .ok(gettextCatalog.getString('Reboot it'))
      .cancel(gettextCatalog.getString('Cancel'));
      $mdDialog.show(confirm).then(function() {
        rebootBox();
      });
    };

    var rebootBox = function() {
      scope.box.state = 'processing';
      scope.box.allowed_job = false;
      Box.update({
        id: scope.box.slug,
        box: { action: 'reboot' }
      }).$promise.then(function(results) {
        scope.box.state = 'rebooting';
        showToast(gettextCatalog.getString('Box successfully rebooted.'));
      }, function(errors) {
        showToast(gettextCatalog.getString('Failed to reboot box, please try again.'));
        console.log('Could not reboot box:', errors);
        scope.box.state = 'online';
      });
    };

    scope.deleteBox = function(ev) {
      var confirm = $mdDialog.confirm()
      .title(gettextCatalog.getString('Are you sure you want to delete this device?'))
      .textContent(gettextCatalog.getString('This cannot be reversed, please be careful. Deleting a box is permanent.'))
      .ariaLabel(gettextCatalog.getString('Delete Box'))
      .targetEvent(ev)
      .ok(gettextCatalog.getString('Delete it'))
      .cancel(gettextCatalog.getString('Cancel'));
      $mdDialog.show(confirm).then(function() {
        deleteBox();
      });
    };

    var deleteBox = function() {
      Box.destroy({id: scope.box.slug}).$promise.then(function(results) {
        $location.path('/' + scope.location.slug);
        showToast(gettextCatalog.getString('Box successfully deleted'));
      }, function(errors) {
        console.log(errors);
        showToast(gettextCatalog.getString('Could not delete box'));
      });
    };

    scope.transferBox = function(ev) {
      $mdDialog.show({
        controller: transferCtrl,
        locals: {
          transfer: transferBox
        },
        templateUrl: 'components/boxes/show/_transfer.html',
        parent: angular.element(document.body),
        targetEvent: ev,
        clickOutsideToClose:true
      });
    };

    function transferCtrl($scope, transfer) {
      $scope.obj = {};
      $scope.cancel = function() {
        $mdDialog.cancel();
      };
      $scope.transfer = function(id) {
        $mdDialog.cancel();
        transfer(id);
      };
    }
    transferCtrl.$inject = ['$scope', 'transfer'];

    var transferBox = function(id) {
      Box.update({
        id: scope.box.slug,
        box: {
          transfer_to: id
        }
      }).$promise.then(function(results) {
        scope.back();
        showToast(gettextCatalog.getString('Box transferred successfully.'));
      }, function(errors) {
        showErrors(errors);
      });
    };

    scope.muteBox = function() {
      scope.box.ignored = !scope.box.ignored;
      Box.update({
        location_id: scope.location.slug,
        id: scope.box.slug,
        box: {
          ignored: scope.box.ignored
        }
      }).$promise.then(function(res) {
        var val = scope.box.ignored ? gettextCatalog.getString('muted') : gettextCatalog.getString('unmuted');
        showToast(gettextCatalog.getString('Box successfully {{val}}.', {val: val}));
      }, function(errors) {
      });
    };

    scope.back = function() {
      window.location.href = '/#/' + scope.location.slug + '/devices';
    };

    var processNotification = function(data) {
      if (data){
        try{
          data = JSON.parse(data);
        }catch(e){
          console.log(e);
        }
      }
      switch(data.type) {
        case 'resync':
          console.log('Device resynced');
          break;
        case 'heartbeat':
          heartbeat(data);
          break;
        case 'speedtest':
          scope.box.speedtest_running = undefined;
          scope.box.allowed_job = true;
          scope.box.latest_speedtest = {
            result: data.message.val,
            timestamp: data.message.timestamp
          };
          break;
        case 'not-connected':
          timeout = $timeout(function() {
            showToast(gettextCatalog.getString('Device lost connection, jobs may fail.'));
            $timeout.cancel(timeout);
          }, 2000);
          break;
        case 'installer':
          if (data.status === true) {
            init();
            showToast(gettextCatalog.getString('Device installed successfully.'));
          } else {
            scope.box.state = 'new';
            showToast(gettextCatalog.getString('Device failed to install, please wait.'));
          }
          break;
        case 'upgrade':
          if (data.status === true) {
            scope.box.state = 'upgrading';
            showToast(gettextCatalog.getString('Upgrade running, please wait while it completes.'));
          } else {
            showToast(gettextCatalog.getString('Upgrade failed to run. Please try again.'));
          }
          break;
        default:
          console.log(data, 'Unknown Event');
      }
    };

    var heartbeat = function(data) {
      scope.box.last_heartbeat = data.last_heartbeat;
      scope.box.state          = data.state;
      scope.box.wan_ip         = data.wan_ip;
      if (scope.box.state === 'offline') {
        scope.box.allowed_job = false;
      } else {
        scope.box.allowed_job = true;
      }
    };

    var processAlertMessages = function() {
      if (scope.box.is_cucumber) {
        if (scope.box.reset_confirmation) {
          showResetConfirm();
        } else if (scope.not_in_zone) {
          showZoneAlert();
        }
      }
    };

    var loadCharts = function() {
      // alert(123)
      $timeout(function() {
        controller.$scope.$broadcast('loadClientChart', 'device');
      },250);
    };

    scope.updatePeriod = function(period) {
      scope.period = period;
      updatePage();
    };

    var updatePage = function(item) {
      var hash            = {};
      hash.interval       = scope.interval;
      hash.period         = scope.period;
      hash.fn             = scope.fn;
      hash.type           = scope.type;
      $location.search(hash);
      loadCharts();
    };

    scope.refresh = function() {
      scope.period = '6h';
      updatePage();
    };

    scope.isOpen = function(section) {
      return menu.isSectionSelected(section);
    };

    scope.toggle = function(section) {
      menu.toggleSelectSection(section);
    };

    var init = function() {
      var deferred = $q.defer();
      Box.get({id: $routeParams.box_id, metadata: true}).$promise.then(function(box) {
        scope.box = box;
        ClientDetails.client = {
          location_id: box.location_id,
          ap_mac: box.calledstationid,
          version: box.v
        };
        scope.loading = undefined;
        poll();
        deferred.resolve();
      }, function() {
        deferred.reject();
      });
      return deferred.promise;
    };

    var getZones = function() {
      var deferred = $q.defer();
      if (scope.box.zone_id || ignoreZone) {
        var msg = 'Ignoring zid: ' + scope.box.zone_id + '. Ignore: ' + ignoreZone;
        deferred.resolve();
      } else {
        Zone.get({
          location_id: scope.location.slug,
          box_id: scope.box.slug
        }).$promise.then(function(results) {
          scope.not_in_zone = (results.zones.length > 0);
          deferred.resolve();
        }, function(error) {
          deferred.reject(error);
        });
      }
      return deferred.promise;
    };

    controller.$scope.$on('fullScreen', function(val,obj) {
      menu.isOpenLeft = false;
      menu.isOpen = false;
      scope.fs = { panel: obj.panel };
      loadCharts();
    });

    controller.$scope.$on('closeFullScreen', function(val,obj) {
      menu.isOpenLeft = true;
      menu.isOpen = true;
      scope.fs = undefined;
      loadCharts();
    });

    var viewOperations = function() {
      $location.path('/' + scope.location.slug + '/devices/' + scope.box.slug + '/operations');
    };

    var viewHistory = function() {
      $location.path('/' + scope.location.slug + '/boxes/' + scope.box.slug + '/versions');
    };

    var poller;
    var poll = function() {
      poller = $timeout(function() {
        console.log('Refreshing device');
        init();
      }, 15000);
    };

    init().then(function() {
      createMenu();
      getZones().then(function() {
        processAlertMessages();
      });
    });

    $rootScope.$on('$routeChangeStart', function (event, next, current) {
      if (channel) {
        channel.unbind();
      }
      $mdBottomSheet.hide();
      $timeout.cancel(timeout);
      $timeout.cancel(poller);
      ClientDetails.client.version = undefined;
      ClientDetails.client.ap_mac = undefined;
    });

  };

  return {
    link: link,
    require: '^clientChart',
    scope: {
      loading: '='
    },
    templateUrl: 'components/boxes/show/_index.html'
  };

}]);
