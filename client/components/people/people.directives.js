'use strict';

var app = angular.module('myApp.people.directives', []);

app.directive('listPeople', ['People', 'Location', 'Audience', 'Report', '$timeout', '$location', '$routeParams', '$mdDialog', 'showToast', 'showErrors', '$q','pagination_labels', 'gettextCatalog', '$route', function(People,Location,Audience,Report,$timeout,$location,$routeParams,$mdDialog,showToast,showErrors,$q, pagination_labels, gettextCatalog, $route) {

  var link = function(scope, el, attrs, controller) {

    scope.currentNavItem = 'people';
    scope.location = {slug: $routeParams.id};
    scope.predicates_changed = $routeParams.predicates_changed;

    var defaultBlob = [{
      value: 30,
      operator: 'gte',
      attribute: 'last_seen',
      relative: true
    }];

    var encodeBlob = function() {
      if (scope.predicates) {
        return window.btoa(angular.toJson(scope.predicates));
      }

      if ($routeParams.blob) {
        return $routeParams.blob;
      }

      return window.btoa(angular.toJson(defaultBlob));
    };

    var formatDates = function(predicates) {
      // this is kinda silly but doesn't recognise the absolute dates
      // until converted like this:
      for (var i = 0; i < predicates.length; i++) {
        if (['last_seen', 'created_at'].includes(predicates[i].attribute) && typeof(predicates[i].value) === 'string') {
          predicates[i].value = new Date(predicates[i].value);
        }
      }
      return predicates;
    };

    function decodeBlob() {
      if ($routeParams.blob) {
        var predicates = JSON.parse(window.atob($routeParams.blob));
        return formatDates(predicates);
      }

      if ($routeParams.audience) {

        //// might need to set the scope here
      }
      return defaultBlob;
    }

    function setParams() {
      scope.query = {
        limit:            $routeParams.per || 25,
        page:             $routeParams.page || 1,
        filter:           $routeParams.q,
        options:          [5,10,25,50,100],
        predicate_type:   $routeParams.predicate_type || 'and'
        // blob:             encodeBlob()
      };
    }

    var setAudiencePredicate = function() {
      if ($routeParams.audience && scope.audiences) {
        for (var i = 0; i < scope.audiences.length; i++) {
          var value = scope.audiences[i];
          if (value.id === $routeParams.audience) {

            scope.predicates = formatDates(value.predicates);
            scope.query.predicate_type = value.predicate_type;
            scope.audience_id = value.id;
          }
        }
      }

      if (!scope.predicates) {
        scope.predicates = decodeBlob();
      }
    };

    var getAudiences = function() {
      var deferred = $q.defer();
      Audience.query({location_id: scope.location.slug}, function(data) {
        if (data.audiences) {
          scope.audiences = data.audiences;
          setAudiencePredicate();
          deferred.resolve();
        } else {
          scope.predicates = decodeBlob();
          deferred.resolve();
        }
      }, function(err) {
        // In case there is no audience
      });
      return deferred.promise;
    };

    var setProfilePhotos = function() {
      for (var i = 0; i < scope.people.length; i++) {
        if (scope.people[i].social && scope.people[i].social.length > 0) {
          if (scope.people[i].social[0].facebook_id) {
            scope.people[i].profile_photo = 'https://graph.facebook.com/' + scope.people[i].social[0].facebook_id + '/picture?type=large';
            return;
          }
          scope.people[i].profile_photo = scope.people[i].social[0].tw_profile_image;
        }
      }
    };

    var getPeople = function() {
      var params = {
        page: scope.query.page,
        per: scope.query.limit,
        q: scope.query.filter,
        location_id: scope.location.slug,
        audience: {
          predicate_type: scope.query.predicate_type
        },
        blob: encodeBlob(),
      };

      People.get(params, function(data) {
        scope.people = data.people;
        scope._links = data._links;
        // setProfilePhotos();
        scope.loading  = undefined;
      }, function(err){
        scope.loading  = undefined;
        scope.people = {};
        scope._links = {};
        setParams();
      });
    };

    function updatePage() {
      var hash    = {};

      hash.page           = scope.query.page;
      hash.q              = scope.query.filter;
      hash.predicate_type = scope.query.predicate_type;
      hash.blob           = encodeBlob();
      hash.audience       = scope.audience;
      hash.predicates_changed = scope.predicates_changed;

      $location.search(hash);
      getAudiences().then(getPeople());
    }

    var downloadReport = function() {
      var params = {
        q: scope.query.filter,
        location_id: scope.location.slug,
        audience: {
          predicate_type: scope.query.predicate_type
        },
        blob: encodeBlob(),
        type: 'people'
      };
      Report.create(params).$promise.then(function(results) {
        showToast(gettextCatalog.getString('Your report will be emailed to you soon'));
      }, function(err) {
        showErrors(err);
      });
    };

    scope.downloadSegment = function() {
      var confirm = $mdDialog.confirm()
      .title(gettextCatalog.getString('Download People Segment'))
      .textContent(gettextCatalog.getString('Please note this is a beta feature. Reports are sent via email.'))
      .ariaLabel(gettextCatalog.getString('People Report'))
      .ok(gettextCatalog.getString('Download'))
      .cancel(gettextCatalog.getString('Cancel'));
      $mdDialog.show(confirm).then(function() {
        downloadReport();
      });
    };

    var deletePeopleSegment = function() {
      var params = {
        q: scope.query.filter,
        location_id: scope.location.slug,
        audience: {
          predicate_type: scope.query.predicate_type
        },
        blob: encodeBlob(),
      };

      People.destroy_segment(params, function(data) {
        showToast(gettextCatalog.getString('People successfully deleted'));
        scope.people = [];
        scope._links.total_entries = 0;
      }, function(err){
        showErrors(err);
      });
    };

    scope.deleteSegment = function() {
      var confirm = $mdDialog.confirm()
      .title(gettextCatalog.getString('Delete People Segment'))
      .textContent(gettextCatalog.getString('Please note this will destroy all currently filtered people and all their related data. This cannot be reversed.'))
      .ariaLabel(gettextCatalog.getString('Delete People Segment'))
      .ok(gettextCatalog.getString('Confirm'))
      .cancel(gettextCatalog.getString('Cancel'));
      $mdDialog.show(confirm).then(function() {
        deletePeopleSegment();
      });
    };

    scope.search = function() {
      updatePage();
    };

    scope.showCard = function(index) {
      scope.focusedCard = index;
    };

    scope.available_options = [];
    scope.available_options.push({value: 'created_at', name: 'First seen', desc: 'When the user first signed in through your WiFi network'});
    scope.available_options.push({value: 'last_seen', name: 'Last seen', desc: 'The last time they were seen on your network'});
    scope.available_options.push({value: 'logins_count', name: 'Number of logins', desc: 'Total number of logins through your network'});
    scope.available_options.push({value: 'email', name: 'Email Address', desc: 'Users associated with an email address on your network'});
    scope.available_options.push({value: 'username', name: 'Username', desc: 'Usernames on your network'});
    scope.available_options.push({value: 'first_name', name: 'First Name', desc: 'First names of users on your network'});
    scope.available_options.push({value: 'last_name', name: 'Last Name', desc: 'Last names of users on your network'});

    var removeFromList = function(person) {
      for (var i = 0, len = scope.people.length; i < len; i++) {
        if (scope.people[i].id === person.id) {
          scope.people.splice(i, 1);
          showToast(gettextCatalog.getString('Person successfully deleted.'));
          break;
        }
      }
    };

    var destroy = function(person) {
      People.destroy({location_id: scope.location.slug, id: person.id}).$promise.then(function(results) {
        removeFromList(person);
      }, function(err) {
        showErrors(err);
      });
    };

    scope.delete = function(person) {
      var confirm = $mdDialog.confirm()
      .title(gettextCatalog.getString('Delete Person'))
      .textContent(gettextCatalog.getString('Are you sure you want to delete this person?'))
      .ariaLabel(gettextCatalog.getString('Delete Person'))
      .ok(gettextCatalog.getString('Delete'))
      .cancel(gettextCatalog.getString('Cancel'));
      $mdDialog.show(confirm).then(function() {
        destroy(person);
      }, function() {
      });
    };

    scope.filterByAudience = function(id) {
      $location.search({audience: id});
      $route.reload(); // lol
    };

    scope.onPaginate = function (page, limit) {
      scope.query.page = page;
      scope.query.limit = limit;
      updatePage();
    };

    scope.cancelRule = function() {
      scope.showChooser = undefined;
      scope.focusedCard = undefined;
    };

    scope.onSelect = function(index) {
      scope.showChooser = undefined;
      var pred = { value: '', operator: 'gte', relative: true };
      switch(index) {
        case 0:
          pred.name = 'First seen';
          pred.attribute = 'created_at';
          pred.operator = 'lte';
          break;
        case 1:
          pred.name = 'Last seen';
          pred.attribute = 'last_seen';
          pred.operator = 'lte';
          break;
        case 2:
          pred.name = 'Number of logins';
          pred.attribute = 'login_count';
          pred.operator = 'gte';
          break;
        case 3:
          pred.name = 'Email Address';
          pred.attribute = 'email';
          pred.operator = 'eq';
          break;
        case 4:
          pred.name = 'Username';
          pred.attribute = 'username';
          pred.operator = 'eq';
          break;
        case 5:
          pred.name = 'First Name';
          pred.attribute = 'first_name';
          pred.operator = 'eq';
          break;
        case 6:
          pred.name = 'Last Name';
          pred.attribute = 'last_name';
          pred.operator = 'eq';
          break;
      }
      scope.predicates.push(pred);
    };

    scope.updateFilters = function() {
      scope.focusedCard = undefined;
      scope.predicates_changed = true;
      updatePage();
    };

    var removeAudienceFromList = function(audience_id) {
      for (var i = 0, len = scope.audiences.length; i < len; i++) {
        if (scope.audiences[i].id === audience_id) {
          scope.audiences.splice(i, 1);
          showToast(gettextCatalog.getString('Audience successfully deleted.'));
          if (scope.audience_id === audience_id) {
            scope.audience = undefined;
            scope.filterByAudience();
          }
          break;
        }
      }
    };

    scope.destroyAudience = function(audience_id) {
      Audience.destroy({location_id: scope.location.slug, id: audience_id}).$promise.then(function(results) {
        removeAudienceFromList(audience_id);
      }, function(err) {
        showErrors(err);
      });
    };

    var createAudience = function(name) {
      Audience.create({}, {
        location_id: scope.location.slug,
        audience: {
          name: name,
          predicate_type: scope.query.predicate_type,
          blob: encodeBlob($routeParams.blob)
        }
      }).$promise.then(function(data) {
        scope.predicates_changed = undefined;
        scope.filterByAudience(data.id);
        showToast(gettextCatalog.getString('Audience saved.'));
        $mdDialog.cancel();
      }, function(error) {
        showErrors(error);
      });
    };

    function DialogController($scope, predicates) {
      $scope.location = location;
      $scope.predicates = predicates;
      $scope.close = function() {
        $mdDialog.cancel();
      };
      $scope.save = function() {
        createAudience($scope.audience.name);
        $mdDialog.cancel();
      };
    }

    DialogController.$inject = ['$scope', 'predicates'];

    var openDialog = function() {
      $mdDialog.show({
        templateUrl: 'components/audiences/_create_audience.html',
        parent: angular.element(document.body),
        clickOutsideToClose: true,
        controller: DialogController,
        locals: {
          predicates: scope.predicates
        }
      });
    };

    var updateAudience = function(audience_id) {
      Audience.update({}, {
        location_id: $routeParams.id,
        id: audience_id,
        audience: {
          blob: encodeBlob($routeParams.blob),
          predicate_type: scope.query.predicate_type
        }
      }).$promise.then(function(results) {
        showToast(gettextCatalog.getString('Audience successfully updated.'));
        // scope.audience = results.id;
        scope.filterByAudience(results.id);
      }, function(err) {
        showErrors(err);
      });
    };

    scope.saveAudience = function() {
      if (scope.audience_id) {
        updateAudience(scope.audience_id);
      } else {
        openDialog(scope.location, scope.query);
      }
    };

    scope.addRule = function() {
      if (!scope.predicates) {
        scope.predicates = [];
      }
      scope.focusedCard = scope.predicates.length;
      scope.showChooser = true;
    };

    scope.removePredicate = function(index) {
      scope.predicates.splice(index, 1);
      scope.focusedCard = undefined;
      if (scope.predicates.length === 0) {
        scope.filterByAudience();
      } else {
        scope.predicates_changed = true;
        updatePage();
      }
    };

    scope.clearFilter = function () {
      scope.query.filter = undefined;
      updatePage();
    };

    var buildLocation = function() {
      scope.location = {
        slug: $routeParams.id,
        setup: {
          splash: attrs.splashSetup,
          integrations: attrs.integrationsSetup
        },
        paid: attrs.locationPaid,
        demo: attrs.demoData
      };
    };

    var checkForGuide = function() {
      buildLocation();
      var falses = [false, 'false'];
      if ($location.path().split('/')[2] !== 'people' &&
        (falses.includes(scope.location.setup.splash) ||
          falses.includes(scope.location.setup.integrations) ||
          falses.includes(scope.location.paid)
        )) {
        $location.path('/' + scope.location.slug + '/guide');
      } else {
        setParams();
        getAudiences().then(function() {
        getPeople();
      });
      }
    };

    var init = function() {
      var t = $timeout(function() {
        checkForGuide();
        $timeout.cancel(t);
      }, 250);
    };

    init();
  };

  return {
    link: link,
    templateUrl: 'components/locations/people/_index.html',
    scope: {
      loading: '=',
      paid: '@',
      splashSetup: '@',
      integrationsSetup: '@',
      locationPaid: '@'
    }
  };

}]);

app.directive('displayPerson', ['People', 'Location', 'Social', 'Guest', 'Email', 'Sms', 'Client', 'DataRequest', '$q', '$routeParams', '$location', '$http', '$compile', '$rootScope', '$timeout', 'showToast', 'showErrors', 'menu', '$mdDialog', 'gettextCatalog', function(People, Location, Social, Guest, Email, Sms, Client, DataRequest, $q, $routeParams, $location, $http, $compile, $rootScope, $timeout, $showToast, showErrors, menu, $mdDialog, gettextCatalog) {

  var link = function(scope, element, attrs) {

    scope.currentNavItem = 'people';

    scope.editName = function(editState) {
      if (editState === true) {
        scope.edit_username = false;
      } else {
        scope.edit_username = true;
      }
    };

    var setProfilePhoto = function() {
      if (scope.person.social && scope.person.social.length > 0) {
        if (scope.person.social[0].facebook_id) {
          scope.person.profile_photo = 'https://graph.facebook.com/' + scope.person.social[0].facebook_id + '/picture?type=large';
          scope.loading  = undefined;
          return;
        }
        scope.person.profile_photo = scope.person.social[0].tw_profile_image;
      }
      scope.loading  = undefined;
    };

    var getSocials = function() {
      Social.get({
        person_id: scope.person.id,
        location_id: scope.location.slug
      }).$promise.then(function(results) {
        scope.person.social = results.social;
        setProfilePhoto();
      }, function(err) {
        setProfilePhoto();
      });
    };

    var getEmails = function() {
      Email.get({
        person_id: scope.person.id,
        location_id: scope.location.slug
      }).$promise.then(function(results) {
        scope.person.emails = results.emails;
      }, function(err) {
      });
    };

    var getSms = function() {
      Sms.get({
        person_id: scope.person.id,
        location_id: scope.location.slug
      }).$promise.then(function(results) {
        scope.person.sms = results.sms;
      }, function(err) {
      });
    };

    var getClients = function() {
      Client.query({
        person_id: scope.person.id,
        location_id: scope.location.slug
      }).$promise.then(function(results) {
        scope.person.clients = results.clients;
      }, function(err) {
      });
    };

    var getRelations = function() {
      getSocials();
      getEmails();
      getSms();
      getClients();
    };

    scope.saveUsername = function() {
      People.update({}, {
        location_id: scope.location.slug,
        id: scope.person.id,
        person: {
          username: scope.person.username
        }
      }).$promise.then(function(results) {
        scope.person = results;
        getRelations();
        scope.edit_username = false;
      }, function(error) {
        showErrors(error);
      });
    };

    var getPerson = function() {
      People.query({location_id: scope.location.slug, id: $routeParams.person_id}).$promise.then(function(res) {
        scope.person = res;
        getRelations();
      }, function(err) {
        scope.loading  = undefined;
        console.log(err);
      });
    };

    var portalPersonRequest = function() {
      scope.portal_request = true;
      if ($routeParams.code) {
        DataRequest.query({person_id: $routeParams.person_id, code: $routeParams.code}).$promise.then(function(res) {
          scope.person = res;
        }, function(err) {
          scope.error_message = err.data.message[0];
        });
      } else {
        scope.error_message = 'Code required to authenticate data request';
      }
      scope.loading  = undefined;
    };

    var init = function() {
      if ($routeParams.id) {
        Location.get({id: $routeParams.id}, function(data) {
          scope.location = data;
          getPerson();
        }, function(err){
          console.log(err);
        });
      } else {
        portalPersonRequest();
      }
    };

    scope.back = function() {
      window.history.back();
    };

    init();

  };

  return {
    link: link,
    scope: {
      loading: '='
    },
    templateUrl: 'components/locations/people/_show.html'
  };

}]);

app.directive('peopleNav', [function() {

  var link = function(scope, element, attrs) {
  };

  return {
    link: link,
    templateUrl: 'components/locations/people/_nav.html'
  };

}]);

app.directive('peopleReports', ['People', 'Location', '$routeParams', '$location', '$http', '$compile', '$rootScope', '$timeout', 'showToast', 'showErrors', 'menu', '$mdDialog', 'gettextCatalog', function(People, Location, $routeParams, $location, $http, $compile, $rootScope, $timeout, showToast, showErrors, menu, $mdDialog, gettextCatalog) {

  var link = function(scope, element, attrs) {

    scope.currentNavItem = 'reports';

    scope.period = $routeParams.period || '7d';

    var init = function() {
      Location.get({id: $routeParams.id}, function(data) {
        scope.location = data;
        scope.loading = undefined;
      }, function(err){
        console.log(err);
      });
    };

    scope.changePeriod = function() {
      var hash    = {};
      hash.period   = scope.period;

      $location.search(hash);
      init();
    };

    init();

  };

  return {
    link: link,
    scope: {
      loading: '='
    },
    templateUrl: 'components/locations/people/_reports.html'
  };

}]);

app.directive('personTimeline', ['PersonTimeline', 'DataRequest', '$routeParams', '$timeout', '$mdDialog', 'showToast', 'gettextCatalog', 'showErrors', function(PersonTimeline, DataRequest, $routeParams, $timeout, $mdDialog, showToast, gettextCatalog, showErrors) {

  var link = function(scope, element, attrs) {

    scope.currentNavItem = 'people';

    scope.person = {slug: $routeParams.person_id};

    var downloadTimeline = function(email) {
      DataRequest.download({person_id: $routeParams.person_id, code: $routeParams.code, email: email}).$promise.then(function(res) {
        showToast(gettextCatalog.getString('Data timeline report on the way to you shortly.'));
      }, function(err) {
        showErrors(err);
      });
    };

    var destroyPerson = function() {
      DataRequest.destroy({person_id: $routeParams.person_id, code: $routeParams.code}).$promise.then(function(res) {
        scope.timelines = undefined;
        scope.portal_request = undefined;
        scope.error_message = 'Data successfully deleted';
      }, function(err) {
        showErrors(err);
      });
    };

    function DialogController($scope) {
      $scope.close = function() {
        $mdDialog.cancel();
      };
      $scope.confirm = function(email) {
        downloadTimeline($scope.email);
        $mdDialog.cancel();
      };
    }

    DialogController.$inject = ['$scope'];

    scope.confirmDownload = function() {
      $mdDialog.show({
        templateUrl: 'components/locations/people/_timeline_download.html',
        parent: angular.element(document.body),
        clickOutsideToClose: true,
        controller: DialogController,
        locals: {
        }
      });
    };

    scope.confirmDestroy = function() {
      var confirm = $mdDialog.confirm()
      .title(gettextCatalog.getString('Delete all data'))
      .textContent(gettextCatalog.getString('All your login data here will be destroyed.'))
      .ariaLabel(gettextCatalog.getString('Delete Data'))
      .ok(gettextCatalog.getString('Confirm'))
      .cancel(gettextCatalog.getString('Cancel'));
      $mdDialog.show(confirm).then(function() {
        destroyPerson();
      });
    };

    var buildLocation = function() {
      scope.location = {
        slug: $routeParams.id,
        setup: {
          splash: attrs.splashSetup,
          integrations: attrs.integrationsSetup
        },
        paid: attrs.locationPaid,
        demo: attrs.demoData
      };
    };

    var getTimeline = function() {
      PersonTimeline.query({location_id: scope.location.slug, person_id: $routeParams.person_id}).$promise.then(function(res) {
        scope.timelines = res.timelines;
        scope.loading = undefined;
      }, function(err) {
        console.log(err);
        scope.loading = undefined;
      });
    };

    var portalTimelineRequest = function() {
      scope.portal_request = true;
      if ($routeParams.code) {
        DataRequest.timeline_query({person_id: $routeParams.person_id, code: $routeParams.code}).$promise.then(function(res) {
          scope.timelines = res.timelines;
          scope.loading = undefined;
        }, function(err) {
          scope.error_message = err.data.message[0];
          scope.loading = undefined;
        });
      } else {
        scope.error_message = 'Unable to authenticate timeline request';
      }
    };

    var init = function() {
      var t = $timeout(function() {
        if ($routeParams.id) {
          buildLocation();
          getTimeline();
        } else {
          portalTimelineRequest();
        }
        $timeout.cancel(t);
      }, 250);
    };

    init();
  };

  return {
    link: link,
    scope: {
      loading: '=',
      paid: '@',
      splashSetup: '@',
      integrationsSetup: '@',
      locationPaid: '@'
    },
    templateUrl: 'components/locations/people/_timeline.html'
  };

}]);
