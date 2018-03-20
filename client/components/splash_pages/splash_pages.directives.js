'use strict';

var app = angular.module('myApp.splash_pages.directives', []);

app.directive('listSplash', ['Location', 'SplashPage', '$routeParams', '$location', 'showToast', 'showErrors', '$mdDialog', '$q', 'gettextCatalog', 'pagination_labels', function(Location,SplashPage,$routeParams,$location,showToast,showErrors,$mdDialog,$q, gettextCatalog, pagination_labels) {

  var link = function(scope,element,attrs) {

    Location.get({id: $routeParams.id}, function(data) {
      scope.location = data;
    }, function(err){
      console.log(err);
    });

    scope.currentNavItem = 'splash';

    scope.location = { slug: $routeParams.id };

    scope.options = {
      autoSelect: true,
      boundaryLinks: false,
      largeEditDialog: false,
      pageSelector: false,
      rowSelection: false
    };

    scope.pagination_labels = pagination_labels;
    scope.query = {
      order:      '-created_at',
      limit:      $routeParams.per || 25,
      page:       $routeParams.page || 1,
      options:    [5,10,25,50,100],
      // direction:  $routeParams.direction || 'desc'
    };

    var createMenu = function() {

      // user permissions //
      scope.menu = [];

      scope.menu.push({
        name: gettextCatalog.getString('Edit'),
        icon: 'settings',
        type: 'settings'
      });

      scope.menu.push({
        name: gettextCatalog.getString('Design'),
        icon: 'format_paint',
        type: 'design'
      });

      scope.menu.push({
        name: gettextCatalog.getString('Delete'),
        icon: 'delete_forever',
        type: 'delete'
      });

    };

    scope.action = function(id,type) {
      switch(type) {
        case 'settings':
          edit(id);
          break;
        case 'design':
          designer(id);
          break;
        case 'delete':
          destroy(id);
          break;
      }
    };

    var destroy = function(id) {
      var confirm = $mdDialog.confirm()
      .title(gettextCatalog.getString('Delete Splash'))
      .textContent(gettextCatalog.getString('Are you sure you want to delete this splash page?'))
      .ariaLabel(gettextCatalog.getString('Delete Splash'))
      .ok(gettextCatalog.getString('Delete'))
      .cancel(gettextCatalog.getString('Cancel'));
      $mdDialog.show(confirm).then(function() {
        destroySplash(id);
      }, function() {
      });
    };

    var destroySplash = function(id) {
      SplashPage.destroy({location_id: scope.location.slug, id: id}).$promise.then(function(results) {
        removeFromList(id);
      }, function(err) {
        showErrors(err);
      });
    };

    var removeFromList = function(id) {
      for (var i = 0, len = scope.splash_pages.length; i < len; i++) {
        if (scope.splash_pages[i].id === id) {
          scope.splash_pages.splice(i, 1);
          showToast(gettextCatalog.getString('Splash successfully deleted'));
          break;
        }
      }
    };

    var designer = function(id) {
      $location.path('/' + scope.location.slug + '/splash_pages/' + id + '/design');
    };

    var edit = function(id) {
      window.location.href = '/#/' + scope.location.slug + '/splash_pages/' + id;
    };

    var init = function() {
      var id = $routeParams.id;
      var deferred = $q.defer();
      scope.promise = deferred.promise;
      SplashPage.get({location_id: scope.location.slug}).$promise.then(function(results) {
        if (id % 1 === 0 && results.location && results.location.slug) {
          $location.path('/' + results.location.slug + '/splash_pages/new').replace().notify(false);
        }
        scope.cloned_id = $routeParams.new;
        scope.splash_pages = results.splash_pages;
        scope.loading = undefined;
        deferred.resolve();
        createMenu();
      }, function(error) {
        deferred.resolve();
      });
    };

    init();
  };

  return {
    link: link,
    templateUrl: 'components/splash_pages/_index.html'
  };

}]);

app.directive('splashNew', ['SplashPage', 'Auth', '$location', '$routeParams', '$rootScope', '$mdDialog', '$localStorage', 'showToast', 'showErrors', 'gettextCatalog', function(SplashPage,Auth,$location,$routeParams,$rootScope,$mdDialog,$localStorage,showToast,showErrors,gettextCatalog) {

  var link = function(scope, element, attrs) {
    scope.open = function(network) {
      $location.path('/' + $routeParams.id + '/splash_pages/new');
    }
  };

  return {
    link: link,
    scope: {
    },
    templateUrl: 'components/splash_pages/_splash_new.html',
  };

}]);

app.directive('splashDesignerForm', ['SplashPage', 'Location', '$compile', function(SplashPage, Location, $compile) {

  var link = function(scope,element,attrs) {

    var leform;

    var init = function() {
      switch(attrs.access) {
      default:
        leform =
          '<span ng-show=\'splash.fb_login_on\'><a class=\'social des-facebook\'>Continue with Facebook</a><br></span>'+
          '<span ng-show=\'splash.g_login_on\'><a class=\'social des-google\'>Continue with Google</a><br></span>'+
          '<span ng-show=\'splash.tw_login_on\'><a class=\'social des-twitter\'>Continue with Twitter</a><br></span>'+
          '<span ng-show=\'splash.backup_sms\'><a class=\'social des-sms\'>Continue with SMS</a><br></span>'+
          '<span ng-show=\'splash.backup_email\'><a class=\'social des-email\'>Continue with Email</a><br></span>'
      }
      var template = $compile('<div>' + leform + '</div>')(scope);
      var compileForm = function() {};
      element.html(template);
    };

    init();

  };

  return {
    link: link,
  };

}]);

app.directive('splashDesigner', ['Location', 'SplashPage', 'SplashPageForm', '$route', '$routeParams', '$q', 'menu', '$location', 'showToast', 'showErrors', '$rootScope', 'gettextCatalog', function(Location, SplashPage, SplashPageForm, $route, $routeParams, $q, menu , $location, showToast, showErrors, $rootScope, gettextCatalog) {

  var link = function(scope,element,attrs) {

    scope.splash = { id: $routeParams.splash_page_id };

    scope.location = { slug: $routeParams.id };

    var setDefaults = function() {
      console.log(scope.splash);
      scope.uploadLogo = (scope.splash.header_image_name === null && scope.splash.logo_file_name === null);
      scope.splash.periodic_days = [];
      if (scope.splash.available_days === null) {
        scope.splash.available_days = [];
      }
      scope.splash.userdays = [];
      if (scope.splash.passwd_change_day === null) {
        scope.splash.passwd_change_day = [];
      }
      scope.splash.periodic_days = [];
      if (scope.splash.available_days === null) {
        scope.splash.available_days = [];
      }
      if (scope.splash.passwd_change_day === undefined) {
        scope.splash.passwd_change_day = [];
      }
    };

    var init = function() {
      return SplashPage.query({
        location_id: scope.location.slug,
        id: $routeParams.splash_page_id,
      }).$promise.then(function(res) {
        scope.splash = res.splash_page;
        setDefaults();
        scope.loading = undefined;
      }, function() {
        scope.loading = undefined;
        scope.errors = true;
      });
    };

    var create = function() {
      SplashPage.create({}, {
        location_id: scope.location.slug,
        splash_page: scope.splash
      }).$promise.then(function(results) {
        $location.path($routeParams.id + '/splash_pages/' + results.splash_page.id);
        showToast(gettextCatalog.getString('Splash created successfully'));
      }, function(err) {
        showErrors(err);
      });
    };

    var save = function(splash, form) {
      if (form) { form.$setPristine(); }
      scope.splash.updating = true;
      SplashPage.update({
        location_id: scope.location.slug,
        id: scope.splash.id,
        splash_page: splash
      }).$promise.then(function(res) {
        scope.splash.updating = undefined;
        showToast(gettextCatalog.getString('Layout successfully updated.'));
      }, function(err) {
        showErrors(err);
        scope.splash.updating = undefined;
      });
    };

    scope.save = function(splash, form) {
      if (scope.splash.id) { save(splash, form); } else { create(); }
    };

    scope.setTrans = function() {
      if (scope.nologo) {
        scope.splash.header_image_name = 'https://d3e9l1phmgx8f2.cloudfront.net/images/login_screens/transparent.png';
      } else {
        scope.splash.header_image_name = undefined;
      }
    };

    scope.saveAndContinue = function() {
      scope.update(scope.splash);
    };

    scope.swapToWelcome = function() {
      if (scope.welcomeEditing === undefined) {
        scope.welcomeEditing = true;
      }
    };

    scope.clearWelcomeEdit = function() {
      if (scope.welcomeEditing !== undefined) {
        scope.welcomeEditing = undefined;
      }
    };

    scope.deleteBg = function(splash,form) {
      splash.background_image_name = '';
      scope.save(splash,form);
    };

    scope.deleteAd = function(splash,form) {
      splash.popup_image = '';
      scope.save(splash,form);
    };

    scope.back = function() {
      window.history.back();
    };

    scope.preview = function() {
      window.open('http://app.my-wifi.co/'+scope.splash.unique_id+'?cmd=login&mac=FF-FF-FF-FF-FF-FF&apname='+scope.splash.preview_mac+'&vcname=instant-C6:3C:E8','winname','directories=no,titlebar=no,toolbar=no,location=no,status=no,menubar=no,scrollbars=no,resizable=no,width=1000,height=800');
    };

    scope.toggle = function(section) {
      menu.toggleSelectSection(section);
    };

    scope.isOpen = function(section) {
      if (section === 'loginType') {
        return !menu.isSectionSelected(section);
      }
      return menu.isSectionSelected(section);
    };

    scope.editSettings = function () {
      window.location = window.location.href.replace('/design','');
    };

    scope.fonts = [
      '\'Helvetica Neue\', Arial, Helvetica, sans-serif',
      'Baskerville, "Times New Roman", Times, serif',
      'Century Gothic", "Apple Gothic", sans-serif"',
      '"Copperplate Light", "Copperplate Gothic Light", serif',
      '"Courier New", Courier, monospace, Futura, "Century Gothic", AppleGothic, sans-serif"',
      'Garamond, "Hoefler Text", "Times New Roman", Times, serif"',
      'Geneva, "Lucida Sans", "Lucida Grande", "Lucida Sans Unicode", Verdana, sans-serif',
      'Georgia, Palatino, "Palatino Linotype", Times, "Times New Roman", serif',
      'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif"',
      '"Lucida Sans", "Lucida Grande", "Lucida Sans Unicode", sans-serif',
      '"Trebuchet MS", "Lucida Sans Unicode", "Lucida Grande", "Lucida Sans", Arial, sans-serif"',
      'Verdana, Geneva, Tahoma, sans-serif',
    ];

    $rootScope.$on('$routeChangeStart', function (event, next, current) {
      menu.hideToolbar = false;
      menu.isOpen = true;
    });

    if (scope.splash.walled_gardens && scope.splash.walled_gardens.length) {
      scope.splash.walled_gardens_array = scope.splash.walled_gardens.split(',');
    } else {
      scope.splash.walled_gardens_array = [];
    }
    scope.access_restrict = [{ key: gettextCatalog.getString('Off'), value: 'none'}, {key: gettextCatalog.getString('Periodic'), value: 'periodic'}, {key: gettextCatalog.getString('Data Downloaded'), value: 'data' }, {key: gettextCatalog.getString('Timed Access'), value: 'timed'}];
    scope.integrations = [{ key: gettextCatalog.getString('Off'), value: 0 }, { key: 'MailChimp', value: 1}, {key: 'CampaignMonitor', value: 2}, {key: 'SendGrid', value: 4}, {key: gettextCatalog.getString('Internal only'), value: 3 }];
    scope.slider = {};
    scope.slider.download_speed = 1024;
    scope.slider.upload_speed = 1024;

    if (!$routeParams.splash_page_id) {
      scope.splash = {
        'available_start': '00:00',
        'available_end': '00:00',
      	'primary_access_id': 20,
      	'splash_name': 'MIMO Splash',
      	'active': true,
      	'passwd_change_day': [],
        'passwd_auto_gen': false,
        'fb_login_on': false,
        'info': 'Welcome, please login below.',
      	'backup_sms': false,
      	'backup_email': true,
      	'access_restrict': 'none',
      	'powered_by': true,
      	'newsletter_active': false,
      	'newsletter_checked': true,
      	'newsletter_type': 0,
      	'walled_gardens': '',
      	'design_id': 1,
      	'logo_file_name': 'https://d247kqobagyqjh.cloudfront.net/api/file/aZgRK0aqQ1a8o8c5mCjy',
      	'background_image_name': 'https://d247kqobagyqjh.cloudfront.net/api/file/DhOaaHbNQEu3WMnSzEIo',
      	'header_image_type': 1,
      	'header_text': 'Sign In Below',
      	'container_width': '850px',
      	'container_text_align': 'center',
      	'body_background_colour': '#FFFFFF',
      	'heading_text_colour': 'rgb(50, 50, 73)',
      	'body_text_colour': 'rgb(50, 50, 73)',
      	'border_colour': 'rgba(255, 255, 255, 0)',
      	'link_colour': 'rgb(66, 103, 178)',
      	'container_colour': 'rgba(255, 255, 255, 0)',
      	'button_colour': 'rgb(50, 50, 73)',
      	'button_radius': '4px',
      	'button_border_colour': 'rgb(50, 50, 73)',
      	'button_padding': '0px 16px',
      	'button_shadow': false,
      	'container_shadow': false,
      	'header_colour': '#FFFFFF',
      	'error_colour': '#ED561B',
      	'container_transparency': 1,
      	'container_float': 'center',
      	'container_inner_width': '100%',
      	'container_inner_padding': '20px',
      	'container_inner_radius': '4px',
      	'bg_dimension': 'full',
      	'words_position': 'right',
      	'logo_position': 'center',
      	'hide_terms': false,
        'font_family': '\'Helvetica Neue\', Arial, Helvetica, sans-serif',
      	'body_font_size': '14px',
      	'heading_text_size': '22px',
      	'heading_2_text_size': '16px',
      	'heading_2_text_colour': 'rgb(50, 50, 73)',
      	'heading_3_text_size': '14px',
      	'heading_3_text_colour': 'rgb(50, 50, 73)',
      	'btn_text': 'Login Now',
      	'btn_font_size': '18px',
      	'btn_font_colour': 'rgba(255, 255, 255, 0.9)',
      	'input_required_colour': '#CCC',
      	'show_welcome': false,
      	'input_height': '40px',
      	'input_padding': '10px 15px',
      	'input_border_colour': '#d0d0d0',
      	'input_border_radius': '0px',
      	'input_border_width': '1px',
      	'input_background': '#FFFFFF',
      	'input_text_colour': '#3D3D3D',
      	'input_max_width': '400px',
      	'footer_text_colour': '#CCC',
      	'popup_ad': false,
      	'popup_background_colour': 'rgb(255,255,255)',
      	'periodic_days': [],
      	'userdays': []
      };
      setDefaults();
      scope.loading = undefined;
    } else {
      init();
    }

  };

  return {
    link: link,
    scope: {
      loading: '='
    },
    templateUrl: 'components/splash_pages/_designer.html'
  };

}]);

app.directive('designMenu', ['designer', 'gettextCatalog', 'menu', function(designer, gettextCatalog, menu) {
  return {
    link: function(scope, element, attrs) {
    },
    // template: '<div ng-include="getContentUrl()"></div>'
    templateUrl: 'components/splash_pages/_menu.html'
   };
}]);

app.directive('removeImage', ['SplashPage', function(SplashPage) {

  var link = function(scope,element,attrs) {

    scope.removeImage = function() {
      scope.temp = scope.attribute;
      scope.attribute = '';
    };

    scope.undoRemoveImage = function() {
      scope.attribute = scope.temp;
      scope.temp = undefined;
    };

  };

  return {
    link: link,
    scope: {
      attribute: '=',
      temp: '='
    },
    template:
      '<p class=\'remove-image\'>'+
      '<small><a ng-show=\'attribute\' class=\'remove-image\' ng-click=\'removeImage()\'><i class="fa fa-times"></i> Remove Image</a>' +
      '<a ng-show=\'temp\' class=\'undo-remove\' ng-click=\'undoRemoveImage()\'>Undo remove</a></small></p>'
  };

}]);

app.directive('accessTypes', [function() {
  var link = function(scope, element, attrs) {
    attrs.$observe('ver', function(start) {
      if (start !== '') {
        scope.getPanel = function() {
          return 'components/splash_pages/access-' + attrs.ver + '.html';
        };
      }
    });
  };

  return {
    link: link,
    template: '<div ng-include="getPanel()"></div>'
  };

}]);

app.directive('splashGeneratePassy', ['Code', function(Code) {

  var link = function(scope,element) {
    scope.generatePassy = function() {
      scope.loading = true;
      Code.generate_password().$promise.then(function(results) {
        scope.attribute = results.password;
        scope.loading = undefined;
        scope.showPass = true;
        // scope.myForm.$pristine = false;
      }, function() {
        scope.error = true;
        scope.loading = undefined;
      });
    };
  };

  return {
    link: link,
    scope: {
      attribute: '=',
      loading: '=',
      showPass: '='
    },
    templateUrl: 'components/splash_pages/_generate_password.html',
  };
}]);

app.directive('splashTemplates', ['SplashPage', '$route', '$routeParams', '$location', '$rootScope', '$timeout', '$mdDialog', 'showToast', 'showErrors', 'gettextCatalog', function(SplashPage, $route, $routeParams, $location, $rootScope, $timeout, $mdDialog, showToast, showErrors, gettextCatalog) {

  var link = function(scope, element, attrs) {

    var SplashTemplates = {
      'material_red': {
        'terms_url': null,
        'logo_file_name': 'https://d247kqobagyqjh.cloudfront.net/api/file/72JuQ4lfQECFPpK6xFWe',
        'background_image_name': 'https://d247kqobagyqjh.cloudfront.net/api/file/ri25tvzERHStdU8M7Xqf',
        'location_image_name': null,
        'location_image_name_svg': null,
        'header_image_name': null,
        'header_image_name_svg': null,
        'header_image_type': 1,
        'header_text': 'Fast and Free WiFi',
        'info': 'Sign in below to enjoy!\n',
        'info_two': null,
        'address': '24 Stone Road',
        'error_message_text': null,
        'website': '',
        'facebook_name': null,
        'twitter_name': null,
        'google_name': null,
        'linkedin_name': null,
        'instagram_name': null,
        'pinterest_name': null,
        'container_width': '400px',
        'container_text_align': 'center',
        'body_background_colour': 'rgb(243, 33, 33)',
        'heading_text_colour': '#000000',
        'body_text_colour': 'rgb(51, 51, 51)',
        'border_colour': 'rgb(255, 255, 255)',
        'link_colour': '#2B68B6',
        'container_colour': 'rgb(255, 255, 255)',
        'button_colour': 'rgb(255, 64, 129)',
        'button_radius': '4px',
        'button_border_colour': 'rgb(255, 64, 129)',
        'button_padding': '0px 16px',
        'button_shadow': true,
        'container_shadow': true,
        'header_colour': '#FFFFFF',
        'error_colour': '#ED561B',
        'container_transparency': 1.0,
        'container_float': 'center',
        'container_inner_width': '100%',
        'container_inner_padding': '20px',
        'container_inner_radius': '4px',
        'bg_dimension': 'full',
        'words_position': 'right',
        'logo_position': 'center',
        'hide_terms': false,
        'font_family': '\'Helvetica Neue\', Arial, Helvetica, sans-serif',
        'body_font_size': '14px',
        'heading_text_size': '22px',
        'heading_2_text_size': '16px',
        'heading_2_text_colour': 'rgb(0, 0, 0)',
        'heading_3_text_size': '14px',
        'heading_3_text_colour': 'rgb(0, 0, 0)',
        'btn_text': 'Login Now',
        'reg_btn_text': 'Register',
        'btn_font_size': '18px',
        'btn_font_colour': 'rgb(255, 255, 255)',
        'input_required_colour': '#CCC',
        'input_required_size': '10px',
        'welcome_text': null,
        'welcome_timeout': null,
        'show_welcome': false,
        'external_css': '',
        'custom_css': null,
        'input_height': '40px',
        'input_padding': '10px 15px',
        'input_border_colour': '#d0d0d0',
        'input_border_radius': '0px',
        'input_border_width': '1px',
        'input_background': '#ffffff',
        'input_text_colour': '#3d3d3d',
        'input_max_width': '400px',
        'footer_text_colour': '#CCC',
        'preview_mac': null
      },
      "material_yellow": {
        "terms_url": null,
        "logo_file_name": "https://d247kqobagyqjh.cloudfront.net/api/file/72JuQ4lfQECFPpK6xFWe",
        "background_image_name": "https://d247kqobagyqjh.cloudfront.net/api/file/BN4oXIckRTO9gLkzHCtV",
        "location_image_name": null,
        "location_image_name_svg": null,
        "header_image_name": null,
        "header_image_name_svg": null,
        "header_image_type": 1,
        "header_text": "Fast and Free WiFi",
        "info": "Sign in below to enjoy!\n",
        "info_two": null,
        "address": "24 Stone Road",
        "error_message_text": null,
        "website": "",
        "facebook_name": null,
        "twitter_name": null,
        "google_name": null,
        "linkedin_name": null,
        "instagram_name": null,
        "pinterest_name": null,
        "container_width": "400px",
        "container_text_align": "center",
        "body_background_colour": "rgb(255, 234, 0)",
        "heading_text_colour": "#000000",
        "body_text_colour": "rgb(51, 51, 51)",
        "border_colour": "rgb(255, 255, 255)",
        "link_colour": "#2B68B6",
        "container_colour": "rgb(255, 255, 255)",
        "button_colour": "rgb(255, 87, 34)",
        "button_radius": "4px",
        "button_border_colour": "rgb(255, 87, 34)",
        "button_padding": "0px 16px",
        "button_shadow": true,
        "container_shadow": true,
        "header_colour": "#FFFFFF",
        "error_colour": "#ED561B",
        "container_transparency": 1.0,
        "container_float": "center",
        "container_inner_width": "100%",
        "container_inner_padding": "20px",
        "container_inner_radius": "4px",
        "bg_dimension": "full",
        "words_position": "right",
        "logo_position": "center",
        "hide_terms": false,
        "font_family": "'Helvetica Neue', Arial, Helvetica, sans-serif",
        "body_font_size": "14px",
        "heading_text_size": "22px",
        "heading_2_text_size": "16px",
        "heading_2_text_colour": "rgb(0, 0, 0)",
        "heading_3_text_size": "14px",
        "heading_3_text_colour": "rgb(0, 0, 0)",
        "btn_text": "Login Now",
        "reg_btn_text": "Register",
        "btn_font_size": "18px",
        "btn_font_colour": "rgb(255, 255, 255)",
        "input_required_colour": "#CCC",
        "input_required_size": "10px",
        "welcome_text": null,
        "welcome_timeout": null,
        "show_welcome": false,
        "external_css": "",
        "custom_css": null,
        "input_height": "40px",
        "input_padding": "10px 15px",
        "input_border_colour": "#d0d0d0",
        "input_border_radius": "0px",
        "input_border_width": "1px",
        "input_background": "#ffffff",
        "input_text_colour": "#3d3d3d",
        "input_max_width": "400px",
        "footer_text_colour": "#CCC",
        "preview_mac": null
      },
      "material_green": {
        "terms_url": null,
        "logo_file_name": "https://d247kqobagyqjh.cloudfront.net/api/file/72JuQ4lfQECFPpK6xFWe",
        "background_image_name": "https://d247kqobagyqjh.cloudfront.net/api/file/gw3sOHJaRsWmoh2xvEZH",
        "location_image_name": null,
        "location_image_name_svg": null,
        "header_image_name": null,
        "header_image_name_svg": null,
        "header_image_type": 1,
        "header_text": "Fast and Free WiFi",
        "info": "Sign in below to enjoy!\n",
        "info_two": null,
        "address": "24 Stone Road",
        "error_message_text": null,
        "website": "",
        "facebook_name": null,
        "twitter_name": null,
        "google_name": null,
        "linkedin_name": null,
        "instagram_name": null,
        "pinterest_name": null,
        "container_width": "400px",
        "container_text_align": "center",
        "body_background_colour": "rgb(35, 173, 74)",
        "heading_text_colour": "rgb(0, 0, 0)",
        "body_text_colour": "#333333",
        "border_colour": "rgb(255, 255, 255)",
        "link_colour": "#2B68B6",
        "container_colour": "rgb(255, 255, 255)",
        "button_colour": "rgb(0, 150, 136)",
        "button_radius": "4px",
        "button_border_colour": "rgb(0, 150, 136)",
        "button_padding": "0px 16px",
        "button_shadow": true,
        "container_shadow": true,
        "header_colour": "#FFFFFF",
        "error_colour": "#ED561B",
        "container_transparency": 1.0,
        "container_float": "center",
        "container_inner_width": "100%",
        "container_inner_padding": "20px",
        "container_inner_radius": "4px",
        "bg_dimension": "full",
        "words_position": "right",
        "logo_position": "center",
        "hide_terms": false,
        "font_family": "'Helvetica Neue', Arial, Helvetica, sans-serif",
        "body_font_size": "14px",
        "heading_text_size": "22px",
        "heading_2_text_size": "16px",
        "heading_2_text_colour": "rgb(0, 0, 0)",
        "heading_3_text_size": "14px",
        "heading_3_text_colour": "rgb(0, 0, 0)",
        "btn_text": "Login Now",
        "reg_btn_text": "Register",
        "btn_font_size": "18px",
        "btn_font_colour": "rgb(255, 255, 255)",
        "input_required_colour": "#CCC",
        "input_required_size": "10px",
        "welcome_text": null,
        "welcome_timeout": null,
        "show_welcome": false,
        "external_css": "",
        "custom_css": null,
        "input_height": "40px",
        "input_padding": "10px 15px",
        "input_border_colour": "#d0d0d0",
        "input_border_radius": "0px",
        "input_border_width": "1px",
        "input_background": "#ffffff",
        "input_text_colour": "#3d3d3d",
        "input_max_width": "400px",
        "footer_text_colour": "#CCC",
        "preview_mac": null
      },
      "material_blue": {
        "terms_url": null,
        "logo_file_name": "https://d247kqobagyqjh.cloudfront.net/api/file/72JuQ4lfQECFPpK6xFWe",
        "background_image_name": "https://d247kqobagyqjh.cloudfront.net/api/file/Vwz1OICvQPCCs65IfLn0",
        "location_image_name": null,
        "location_image_name_svg": null,
        "header_image_name": null,
        "header_image_name_svg": null,
        "header_image_type": 1,
        "header_text": "Fast and Free WiFi",
        "info": "Sign in below to enjoy!",
        "info_two": null,
        "address": "24 Stone Road",
        "error_message_text": null,
        "website": "",
        "facebook_name": null,
        "twitter_name": null,
        "google_name": null,
        "linkedin_name": null,
        "instagram_name": null,
        "pinterest_name": null,
        "container_width": "400px",
        "container_text_align": "center",
        "body_background_colour": "rgb(33, 150, 243)",
        "heading_text_colour": "#000000",
        "body_text_colour": "#333333",
        "border_colour": "rgb(204, 204, 204)",
        "link_colour": "#2B68B6",
        "container_colour": "rgb(255, 255, 255)",
        "button_colour": "rgb(3, 169, 244)",
        "button_radius": "4px",
        "button_border_colour": "rgb(3, 169, 244)",
        "button_padding": "0px 16px",
        "button_shadow": true,
        "container_shadow": true,
        "header_colour": "#FFFFFF",
        "error_colour": "#ED561B",
        "container_transparency": 1.0,
        "container_float": "center",
        "container_inner_width": "100%",
        "container_inner_padding": "20px",
        "container_inner_radius": "4px",
        "bg_dimension": "full",
        "words_position": "right",
        "logo_position": "center",
        "hide_terms": false,
        "font_family": "'Helvetica Neue', Arial, Helvetica, sans-serif",
        "body_font_size": "14px",
        "heading_text_size": "22px",
        "heading_2_text_size": "16px",
        "heading_2_text_colour": "#000000",
        "heading_3_text_size": "14px",
        "heading_3_text_colour": "#000000",
        "btn_text": "Login Now",
        "reg_btn_text": "Register",
        "btn_font_size": "18px",
        "btn_font_colour": "rgb(255, 255, 255)",
        "input_required_colour": "#CCC",
        "input_required_size": "10px",
        "welcome_text": null,
        "welcome_timeout": null,
        "show_welcome": false,
        "external_css": "",
        "custom_css": null,
        "input_height": "40px",
        "input_padding": "10px 15px",
        "input_border_colour": "#d0d0d0",
        "input_border_radius": "0px",
        "input_border_width": "1px",
        "input_background": "#ffffff",
        "input_text_colour": "#3d3d3d",
        "input_max_width": "400px",
        "footer_text_colour": "#CCC",
        "preview_mac": null
      },
      "desk_template": {
        "terms_url": null,
        "logo_file_name": "https://d247kqobagyqjh.cloudfront.net/api/file/72JuQ4lfQECFPpK6xFWe",
        "background_image_name": "https://d247kqobagyqjh.cloudfront.net/api/file/eGRm1Cl5RbSL50CSZDhp",
        "location_image_name": null,
        "location_image_name_svg": null,
        "header_image_name": null,
        "header_image_name_svg": null,
        "header_image_type": 1,
        "header_text": "Welcome to ACME Office",
        "info": "Click below to enjoy fast & Free WiFi!",
        "info_two": null,
        "address": "24 Stone Road",
        "error_message_text": null,
        "website": "",
        "facebook_name": null,
        "twitter_name": null,
        "google_name": null,
        "linkedin_name": null,
        "instagram_name": null,
        "pinterest_name": null,
        "container_width": "400px",
        "container_text_align": "center",
        "body_background_colour": "rgb(33, 150, 243)",
        "heading_text_colour": "rgb(0, 0, 0)",
        "body_text_colour": "rgb(51, 51, 51)",
        "border_colour": "rgb(204, 204, 204)",
        "link_colour": "#2B68B6",
        "container_colour": "rgb(255, 255, 255)",
        "button_colour": "rgb(73, 49, 24)",
        "button_radius": "8px",
        "button_border_colour": "rgb(73, 49, 24)",
        "button_padding": "0px 16px",
        "button_shadow": false,
        "container_shadow": true,
        "header_colour": "#FFFFFF",
        "error_colour": "#ED561B",
        "container_transparency": 1.0,
        "container_float": "center",
        "container_inner_width": "100%",
        "container_inner_padding": "20px",
        "container_inner_radius": "20px",
        "bg_dimension": "full",
        "words_position": "right",
        "logo_position": "center",
        "hide_terms": false,
        "font_family": "'Helvetica Neue', Arial, Helvetica, sans-serif",
        "body_font_size": "14px",
        "heading_text_size": "22px",
        "heading_2_text_size": "16px",
        "heading_2_text_colour": "rgb(0, 0, 0)",
        "heading_3_text_size": "14px",
        "heading_3_text_colour": "rgb(0, 0, 0)",
        "btn_text": "Login Now",
        "reg_btn_text": "Register",
        "btn_font_size": "18px",
        "btn_font_colour": "rgb(255, 255, 255)",
        "input_required_colour": "#CCC",
        "input_required_size": "10px",
        "welcome_text": null,
        "welcome_timeout": null,
        "show_welcome": false,
        "external_css": "",
        "custom_css": null,
        "input_height": "40px",
        "input_padding": "10px 15px",
        "input_border_colour": "#d0d0d0",
        "input_border_radius": "0px",
        "input_border_width": "1px",
        "input_background": "#ffffff",
        "input_text_colour": "#3d3d3d",
        "input_max_width": "400px",
        "footer_text_colour": "#CCC",
        "preview_mac": null
      },
      "camp_template": {
        "terms_url": null,
        "logo_file_name": "https://d247kqobagyqjh.cloudfront.net/api/file/72JuQ4lfQECFPpK6xFWe",
        "background_image_name": "https://d247kqobagyqjh.cloudfront.net/api/file/KJYufz8WQuGihmYykoL8",
        "location_image_name": null,
        "location_image_name_svg": null,
        "header_image_name": null,
        "header_image_name_svg": null,
        "header_image_type": 1,
        "header_text": "Welcome to ACME Campsite",
        "info": "Sign in and enjoy free WiFi!",
        "info_two": null,
        "address": "24 Stone Road",
        "error_message_text": null,
        "website": "",
        "facebook_name": null,
        "twitter_name": null,
        "google_name": null,
        "linkedin_name": null,
        "instagram_name": null,
        "pinterest_name": null,
        "container_width": "400px",
        "container_text_align": "center",
        "body_background_colour": "rgb(255, 109, 0)",
        "heading_text_colour": "rgb(0, 0, 0)",
        "body_text_colour": "rgb(51, 51, 51)",
        "border_colour": "rgb(255, 255, 255)",
        "link_colour": "#2B68B6",
        "container_colour": "rgb(255, 255, 255)",
        "button_colour": "rgb(255, 109, 0)",
        "button_radius": "4px",
        "button_border_colour": "rgb(255, 109, 0)",
        "button_padding": "0px 16px",
        "button_shadow": true,
        "container_shadow": true,
        "header_colour": "#FFFFFF",
        "error_colour": "#ED561B",
        "container_transparency": 1.0,
        "container_float": "center",
        "container_inner_width": "100%",
        "container_inner_padding": "20px",
        "container_inner_radius": "4px",
        "bg_dimension": "full",
        "words_position": "right",
        "logo_position": "center",
        "hide_terms": false,
        "font_family": "'Helvetica Neue', Arial, Helvetica, sans-serif",
        "body_font_size": "14px",
        "heading_text_size": "22px",
        "heading_2_text_size": "16px",
        "heading_2_text_colour": "rgb(0, 0, 0)",
        "heading_3_text_size": "14px",
        "heading_3_text_colour": "rgb(0, 0, 0)",
        "btn_text": "Login Now",
        "reg_btn_text": "Register",
        "btn_font_size": "18px",
        "btn_font_colour": "rgb(255, 255, 255)",
        "input_required_colour": "#CCC",
        "input_required_size": "10px",
        "welcome_text": null,
        "welcome_timeout": null,
        "show_welcome": false,
        "external_css": "",
        "custom_css": null,
        "input_height": "40px",
        "input_padding": "10px 15px",
        "input_border_colour": "rgb(208, 208, 208)",
        "input_border_radius": "0px",
        "input_border_width": "1px",
        "input_background": "rgb(255, 255, 255)",
        "input_text_colour": "rgb(61, 61, 61)",
        "input_max_width": "400px",
        "footer_text_colour": "#CCC",
        "preview_mac": null
      },
      "coffee_template": {
        "terms_url": null,
        "logo_file_name": "https://d247kqobagyqjh.cloudfront.net/api/file/72JuQ4lfQECFPpK6xFWe",
        "background_image_name": "https://d247kqobagyqjh.cloudfront.net/api/file/elgpN7xBSeTwpWhgnmZ2",
        "location_image_name": null,
        "location_image_name_svg": null,
        "header_image_name": null,
        "header_image_name_svg": null,
        "header_image_type": 1,
        "header_text": "Welcome to ACME Coffee",
        "info": "Click below to enjoy fast & Free WiFi!",
        "info_two": null,
        "address": "24 Stone Road",
        "error_message_text": null,
        "website": "",
        "facebook_name": null,
        "twitter_name": null,
        "google_name": null,
        "linkedin_name": null,
        "instagram_name": null,
        "pinterest_name": null,
        "container_width": "400px",
        "container_text_align": "center",
        "body_background_colour": "rgb(104, 53, 15)",
        "heading_text_colour": "#000000",
        "body_text_colour": "rgb(51, 51, 51)",
        "border_colour": "rgb(255, 255, 255)",
        "link_colour": "#2B68B6",
        "container_colour": "rgb(255, 255, 255)",
        "button_colour": "rgb(104, 53, 15)",
        "button_radius": "8px",
        "button_border_colour": "rgb(104, 53, 15)",
        "button_padding": "0px 16px",
        "button_shadow": false,
        "container_shadow": false,
        "header_colour": "#FFFFFF",
        "error_colour": "#ED561B",
        "container_transparency": 1.0,
        "container_float": "center",
        "container_inner_width": "100%",
        "container_inner_padding": "20px",
        "container_inner_radius": "20px",
        "bg_dimension": "full",
        "words_position": "right",
        "logo_position": "center",
        "hide_terms": false,
        "font_family": "'Helvetica Neue', Arial, Helvetica, sans-serif",
        "body_font_size": "14px",
        "heading_text_size": "22px",
        "heading_2_text_size": "16px",
        "heading_2_text_colour": "rgb(0, 0, 0)",
        "heading_3_text_size": "14px",
        "heading_3_text_colour": "rgb(0, 0, 0)",
        "btn_text": "Login Now",
        "reg_btn_text": "Register",
        "btn_font_size": "18px",
        "btn_font_colour": "rgb(255, 255, 255)",
        "input_required_colour": "#CCC",
        "input_required_size": "10px",
        "welcome_text": null,
        "welcome_timeout": null,
        "show_welcome": false,
        "external_css": "",
        "custom_css": null,
        "input_height": "40px",
        "input_padding": "10px 15px",
        "input_border_colour": "#d0d0d0",
        "input_border_radius": "0px",
        "input_border_width": "1px",
        "input_background": "#ffffff",
        "input_text_colour": "#3d3d3d",
        "input_max_width": "400px",
        "footer_text_colour": "#CCC",
        "preview_mac": null
      },
      "hotel_template": {
        "terms_url": null,
        "logo_file_name": "https://d247kqobagyqjh.cloudfront.net/api/file/72JuQ4lfQECFPpK6xFWe",
        "background_image_name": "https://d247kqobagyqjh.cloudfront.net/api/file/3MW4nWTSeGfCEBlkblOF",
        "location_image_name": null,
        "location_image_name_svg": null,
        "header_image_name": null,
        "header_image_name_svg": null,
        "header_image_type": 1,
        "header_text": "Welcome to ACME Hotel",
        "info": "Click below to enjoy fast & Free WiFi!",
        "info_two": "",
        "address": "24 Stone Road",
        "error_message_text": null,
        "website": "",
        "facebook_name": null,
        "twitter_name": null,
        "google_name": null,
        "linkedin_name": null,
        "instagram_name": null,
        "pinterest_name": null,
        "container_width": "400px",
        "container_text_align": "center",
        "body_background_colour": "rgb(255, 255, 255)",
        "heading_text_colour": "rgb(0, 0, 0)",
        "body_text_colour": "rgb(51, 51, 51)",
        "border_colour": "rgb(255, 255, 255)",
        "link_colour": "#2B68B6",
        "container_colour": "rgb(255, 255, 255)",
        "button_colour": "rgb(159, 190, 214)",
        "button_radius": "4px",
        "button_border_colour": "rgb(159, 190, 214)",
        "button_padding": "0px 16px",
        "button_shadow": false,
        "container_shadow": true,
        "header_colour": "#FFFFFF",
        "error_colour": "#ED561B",
        "container_transparency": 1.0,
        "container_float": "center",
        "container_inner_width": "100%",
        "container_inner_padding": "20px",
        "container_inner_radius": "4px",
        "bg_dimension": "full",
        "words_position": "right",
        "logo_position": "center",
        "hide_terms": false,
        "font_family": "'Helvetica Neue', Arial, Helvetica, sans-serif",
        "body_font_size": "14px",
        "heading_text_size": "22px",
        "heading_2_text_size": "16px",
        "heading_2_text_colour": "rgb(0, 0, 0)",
        "heading_3_text_size": "14px",
        "heading_3_text_colour": "rgb(0, 0, 0)",
        "btn_text": "Login Now",
        "reg_btn_text": "Register",
        "btn_font_size": "18px",
        "btn_font_colour": "rgb(255, 255, 255)",
        "input_required_colour": "#CCC",
        "input_required_size": "10px",
        "welcome_text": null,
        "welcome_timeout": null,
        "show_welcome": false,
        "external_css": "",
        "custom_css": null,
        "input_height": "40px",
        "input_padding": "10px 15px",
        "input_border_colour": "rgb(208, 208, 208)",
        "input_border_radius": "0px",
        "input_border_width": "1px",
        "input_background": "rgb(255, 255, 255)",
        "input_text_colour": "rgb(61, 61, 61)",
        "input_max_width": "400px",
        "footer_text_colour": "#CCC",
        "preview_mac": null
      },
      "shop_template": {
        "terms_url": null,
        "logo_file_name": "https://d247kqobagyqjh.cloudfront.net/api/file/aZgRK0aqQ1a8o8c5mCjy",
        "background_image_name": "https://d247kqobagyqjh.cloudfront.net/api/file/n1UGUJ0SmyY7s4ZBNxbn",
        "location_image_name": null,
        "location_image_name_svg": null,
        "header_image_name": null,
        "header_image_name_svg": null,
        "header_image_type": 1,
        "header_text": "Welcome to ACME Market",
        "info": "Sign in and enjoy free WiFi!",
        "info_two": null,
        "address": "24 Stone Road",
        "error_message_text": null,
        "website": "",
        "facebook_name": null,
        "twitter_name": null,
        "google_name": null,
        "linkedin_name": null,
        "instagram_name": null,
        "pinterest_name": null,
        "container_width": "400px",
        "container_text_align": "center",
        "body_background_colour": "rgb(0, 150, 136)",
        "heading_text_colour": "#000000",
        "body_text_colour": "#333333",
        "border_colour": "rgb(255, 255, 255)",
        "link_colour": "#2B68B6",
        "container_colour": "rgb(255, 255, 255)",
        "button_colour": "rgb(0, 150, 136)",
        "button_radius": "8px",
        "button_border_colour": "rgb(0, 150, 136)",
        "button_padding": "0px 16px",
        "button_shadow": false,
        "container_shadow": true,
        "header_colour": "#FFFFFF",
        "error_colour": "#ED561B",
        "container_transparency": 1.0,
        "container_float": "center",
        "container_inner_width": "100%",
        "container_inner_padding": "20px",
        "container_inner_radius": "10px",
        "bg_dimension": "full",
        "words_position": "right",
        "logo_position": "center",
        "hide_terms": false,
        "font_family": "'Helvetica Neue', Arial, Helvetica, sans-serif",
        "body_font_size": "14px",
        "heading_text_size": "22px",
        "heading_2_text_size": "16px",
        "heading_2_text_colour": "#000000",
        "heading_3_text_size": "14px",
        "heading_3_text_colour": "#000000",
        "btn_text": "Login Now",
        "reg_btn_text": "Register",
        "btn_font_size": "18px",
        "btn_font_colour": "rgb(255, 255, 255)",
        "input_required_colour": "#CCC",
        "input_required_size": "10px",
        "welcome_text": null,
        "welcome_timeout": null,
        "show_welcome": false,
        "external_css": "",
        "custom_css": null,
        "input_height": "40px",
        "input_padding": "10px 15px",
        "input_border_colour": "#d0d0d0",
        "input_border_radius": "0px",
        "input_border_width": "1px",
        "input_background": "#ffffff",
        "input_text_colour": "#3d3d3d",
        "input_max_width": "400px",
        "footer_text_colour": "#CCC",
        "preview_mac": null
      },
      "gradient_1": {
      	"terms_url": null,
      	"logo_file_name": "https://d247kqobagyqjh.cloudfront.net/api/file/72JuQ4lfQECFPpK6xFWe",
      	"background_image_name": "https://d247kqobagyqjh.cloudfront.net/api/file/spuYqKw7RgGLL87YzpHA",
      	"location_image_name": null,
      	"location_image_name_svg": null,
      	"header_image_name": null,
      	"header_image_name_svg": null,
      	"header_image_type": 1,
      	"header_text": "Fast & Free WiFi",
      	"info": "",
      	"info_two": null,
      	"address": "",
      	"error_message_text": null,
      	"website": "",
      	"facebook_name": null,
      	"twitter_name": null,
      	"google_name": null,
      	"linkedin_name": null,
      	"instagram_name": null,
      	"pinterest_name": null,
      	"container_width": "400px",
      	"container_text_align": "center",
      	"body_background_colour": "rgb(218, 33, 243)",
      	"heading_text_colour": "rgba(255, 255, 255, 0.9)",
      	"body_text_colour": "rgba(255, 255, 255, 0.9)",
      	"border_colour": "rgba(255, 255, 255, 0)",
      	"link_colour": "rgb(255, 255, 255)",
      	"container_colour": "rgba(255, 255, 255, 0)",
      	"button_colour": "rgb(255, 64, 129)",
      	"button_radius": "4px",
      	"button_border_colour": "rgb(255, 64, 129)",
      	"button_padding": "0px 16px",
      	"button_shadow": false,
      	"container_shadow": false,
      	"header_colour": "#FFFFFF",
      	"error_colour": "#ED561B",
      	"container_transparency": 1,
      	"container_float": "center",
      	"container_inner_width": "100%",
      	"container_inner_padding": "20px",
      	"container_inner_radius": "4px",
      	"bg_dimension": "full",
      	"words_position": "right",
      	"logo_position": "center",
      	"hide_terms": false,
      	"font_family": "'Helvetica Neue', Arial, Helvetica, sans-serif",
      	"body_font_size": "14px",
      	"heading_text_size": "22px",
      	"heading_2_text_size": "16px",
      	"heading_2_text_colour": "rgba(255, 255, 255, 0.8)",
      	"heading_3_text_size": "14px",
      	"heading_3_text_colour": "rgba(255, 255, 255, 0.9)",
      	"btn_text": "Login Now",
      	"reg_btn_text": "Register",
      	"btn_font_size": "18px",
      	"btn_font_colour": "rgb(255, 255, 255)",
      	"input_required_colour": "#CCC",
      	"input_required_size": "10px",
      	"welcome_text": null,
      	"welcome_timeout": null,
      	"show_welcome": false,
      	"external_css": "",
      	"custom_css": null,
      	"input_height": "40px",
      	"input_padding": "10px 15px",
      	"input_border_colour": "#d0d0d0",
      	"input_border_radius": "0px",
      	"input_border_width": "1px",
      	"input_background": "#ffffff",
      	"input_text_colour": "#3d3d3d",
      	"input_max_width": "400px",
      	"footer_text_colour": "#CCC",
      	"preview_mac": null
      },
      "gradient_2": {
      	"terms_url": null,
        "logo_file_name": "https://d247kqobagyqjh.cloudfront.net/api/file/72JuQ4lfQECFPpK6xFWe",
      	"background_image_name": "https://d247kqobagyqjh.cloudfront.net/api/file/NxeRGFfRT0KMtjw7TU6x",
      	"location_image_name": null,
      	"location_image_name_svg": null,
      	"header_image_name": null,
      	"header_image_name_svg": null,
      	"header_image_type": 1,
      	"header_text": "Sign In For Free WiFi",
      	"info": "",
      	"info_two": null,
      	"address": "",
      	"error_message_text": null,
      	"website": "",
        "facebook_name": null,
        "twitter_name": null,
        "google_name": null,
        "linkedin_name": null,
        "instagram_name": null,
        "pinterest_name": null,
      	"container_width": "550px",
      	"container_text_align": "center",
      	"body_background_colour": "rgb(200, 159, 253)",
      	"heading_text_colour": "rgb(255, 255, 255)",
      	"body_text_colour": "rgb(255, 255, 255)",
      	"border_colour": "rgba(255, 255, 255, 0)",
      	"link_colour": "rgb(255, 255, 255)",
      	"container_colour": "rgba(255, 255, 255, 0.2)",
      	"button_colour": "rgba(255, 255, 255, 0.8)",
      	"button_radius": "40px",
      	"button_border_colour": "rgba(255, 255, 255, 0.8)",
      	"button_padding": "0px 16px",
      	"button_shadow": false,
      	"container_shadow": false,
      	"header_colour": "#FFFFFF",
      	"error_colour": "#ED561B",
      	"container_transparency": 1,
      	"container_float": "center",
      	"container_inner_width": "100%",
      	"container_inner_padding": "20px",
      	"container_inner_radius": "20px",
      	"bg_dimension": "full",
      	"words_position": "right",
      	"logo_position": "center",
      	"hide_terms": false,
      	"font_family": "'Helvetica Neue', Arial, Helvetica, sans-serif",
      	"body_font_size": "14px",
      	"heading_text_size": "22px",
      	"heading_2_text_size": "16px",
      	"heading_2_text_colour": "rgb(255, 255, 255)",
      	"heading_3_text_size": "14px",
      	"heading_3_text_colour": "rgb(255, 255, 255)",
      	"btn_text": "Login Now",
      	"reg_btn_text": "Register",
      	"btn_font_size": "18px",
      	"btn_font_colour": "rgba(0, 0, 0, 0.8)",
      	"input_required_colour": "#CCC",
      	"input_required_size": "10px",
      	"welcome_text": null,
      	"welcome_timeout": null,
      	"show_welcome": false,
      	"external_css": null,
      	"custom_css": null,
      	"input_height": "50px",
      	"input_padding": "10px 15px",
      	"input_border_colour": "rgb(255, 255, 255)",
      	"input_border_radius": "40px",
      	"input_border_width": "1px",
      	"input_background": "rgba(255, 255, 255, 0.1)",
      	"input_text_colour": "rgb(255, 255, 255)",
      	"input_max_width": "400px",
      	"footer_text_colour": "#CCC",
        "preview_mac": null
      },
      "gradient_3": {
      	"terms_url": null,
      	"logo_file_name": "https://d247kqobagyqjh.cloudfront.net/api/file/72JuQ4lfQECFPpK6xFWe",
      	"background_image_name": "https://d247kqobagyqjh.cloudfront.net/api/file/JEc5nOrkSpGBOgawwxLQ",
      	"location_image_name": null,
      	"location_image_name_svg": null,
      	"header_image_name": null,
      	"header_image_name_svg": null,
      	"header_image_type": 1,
      	"header_text": "Welcome",
      	"info": "Sign in below for Free WiFi",
      	"info_two": null,
      	"address": "",
      	"error_message_text": null,
      	"website": null,
      	"facebook_name": null,
      	"twitter_name": null,
      	"google_name": null,
      	"linkedin_name": null,
      	"instagram_name": null,
      	"pinterest_name": null,
      	"container_width": "850px",
      	"container_text_align": "center",
      	"body_background_colour": "rgb(109, 245, 222)",
      	"heading_text_colour": "rgba(255, 255, 255, 0.9)",
      	"body_text_colour": "rgba(255, 255, 255, 0.9)",
      	"border_colour": "rgba(204, 204, 204, 0)",
      	"link_colour": "rgb(255, 255, 255)",
      	"container_colour": "rgba(255, 255, 255, 0)",
      	"button_colour": "rgb(86, 207, 218)",
      	"button_radius": "40px",
      	"button_border_colour": "rgba(255, 255, 255, 0)",
      	"button_padding": "0px 16px",
      	"button_shadow": false,
      	"container_shadow": false,
      	"header_colour": "#FFFFFF",
      	"error_colour": "#ED561B",
      	"container_transparency": 1,
      	"container_float": "center",
      	"container_inner_width": "100%",
      	"container_inner_padding": "20px",
      	"container_inner_radius": "4px",
      	"bg_dimension": "full",
      	"words_position": "right",
      	"logo_position": "center",
      	"hide_terms": false,
      	"font_family": "Century Gothic\", \"Apple Gothic\", sans-serif\"",
      	"body_font_size": "14px",
      	"heading_text_size": "22px",
      	"heading_2_text_size": "16px",
      	"heading_2_text_colour": "rgba(255, 255, 255, 0.9)",
      	"heading_3_text_size": "14px",
      	"heading_3_text_colour": "rgba(255, 255, 255, 0.9)",
      	"btn_text": "Connect Now",
      	"reg_btn_text": "Register",
      	"btn_font_size": "18px",
      	"btn_font_colour": "rgb(255, 255, 255)",
      	"input_required_colour": "#CCC",
      	"input_required_size": "10px",
      	"welcome_text": null,
      	"welcome_timeout": null,
      	"show_welcome": false,
      	"external_css": null,
      	"custom_css": null,
      	"input_height": "40px",
      	"input_padding": "10px 15px",
      	"input_border_colour": "rgba(255, 255, 255, 0)",
      	"input_border_radius": "4px",
      	"input_border_width": "1px",
      	"input_background": "rgba(255, 255, 255, 0.8)",
      	"input_text_colour": "rgba(0, 0, 0, 0.6)",
      	"input_max_width": "400px",
      	"footer_text_colour": "#CCC",
        "preview_mac": null
      },
      "gradient_4": {
      	"terms_url": null,
      	"logo_file_name": "https://d247kqobagyqjh.cloudfront.net/api/file/aZgRK0aqQ1a8o8c5mCjy",
      	"background_image_name": "https://d247kqobagyqjh.cloudfront.net/api/file/DhOaaHbNQEu3WMnSzEIo",
      	"location_image_name": null,
      	"location_image_name_svg": null,
      	"header_image_name": null,
      	"header_image_name_svg": null,
      	"header_image_type": 1,
      	"header_text": "Sign In Below",
      	"info": "",
      	"info_two": null,
      	"address": "",
      	"error_message_text": null,
      	"website": null,
      	"facebook_name": null,
      	"twitter_name": null,
      	"google_name": null,
      	"linkedin_name": null,
      	"instagram_name": null,
      	"pinterest_name": null,
      	"container_width": "850px",
      	"container_text_align": "center",
      	"body_background_colour": "#FFFFFF",
      	"heading_text_colour": "rgb(50, 50, 73)",
      	"body_text_colour": "rgb(50, 50, 73)",
      	"border_colour": "rgba(255, 255, 255, 0)",
      	"link_colour": "rgb(66, 103, 178)",
      	"container_colour": "rgba(255, 255, 255, 0)",
      	"button_colour": "rgb(50, 50, 73)",
      	"button_radius": "4px",
      	"button_border_colour": "rgb(50, 50, 73)",
      	"button_padding": "0px 16px",
      	"button_shadow": false,
      	"container_shadow": false,
      	"header_colour": "#FFFFFF",
      	"error_colour": "#ED561B",
      	"container_transparency": 1,
      	"container_float": "center",
      	"container_inner_width": "100%",
      	"container_inner_padding": "20px",
      	"container_inner_radius": "4px",
      	"bg_dimension": "full",
      	"words_position": "right",
      	"logo_position": "center",
      	"hide_terms": false,
      	"font_family": "Verdana, Geneva, Tahoma, sans-serif",
      	"body_font_size": "14px",
      	"heading_text_size": "22px",
      	"heading_2_text_size": "16px",
      	"heading_2_text_colour": "rgb(50, 50, 73)",
      	"heading_3_text_size": "14px",
      	"heading_3_text_colour": "rgb(50, 50, 73)",
      	"btn_text": "Login Now",
      	"reg_btn_text": "Register",
      	"btn_font_size": "18px",
      	"btn_font_colour": "rgba(255, 255, 255, 0.9)",
      	"input_required_colour": "#CCC",
      	"input_required_size": "10px",
      	"welcome_text": null,
      	"welcome_timeout": null,
      	"show_welcome": false,
      	"external_css": null,
      	"custom_css": null,
      	"input_height": "40px",
      	"input_padding": "10px 15px",
      	"input_border_colour": "#d0d0d0",
      	"input_border_radius": "0px",
      	"input_border_width": "1px",
      	"input_background": "#FFFFFF",
      	"input_text_colour": "#3D3D3D",
      	"input_max_width": "400px",
      	"footer_text_colour": "#CCC",
        "preview_mac": null
      }
    };

    scope.openDialog = function() {
      $mdDialog.show({
        templateUrl: 'components/splash_pages/_splash_templates.html',
        parent: angular.element(document.body),
        clickOutsideToClose: false,
        controller: DialogController,
        locals: {
          loading: scope.loading
        }
      });
    };

    var showConfirm = function(template) {
      scope.template = template;
      $mdDialog.show({
        templateUrl: 'components/splash_pages/_template_confirm.html',
        parent: angular.element(document.body),
        clickOutsideToClose: false,
        controller: DialogController,
        locals: {
          loading: scope.loading,
        }
      });
    };

    var updateSplash = function() {
      scope.location = { slug: $routeParams.id };
      var fullTemplate = SplashTemplates[scope.template];
      fullTemplate.id = $routeParams.splash_page_id;
      scope.save(fullTemplate)
      $route.reload();
    };

    function DialogController($scope,loading) {
      $scope.loading = loading;

      $scope.close = function() {
        $mdDialog.cancel();
      };
      $scope.next = function() {
        showConfirm($scope.splash.template);
      };
      $scope.save = function() {
        updateSplash();
        $mdDialog.cancel();
      };
      $scope.back = function() {
        scope.openDialog();
      };
    }

    DialogController.$inject = ['$scope', 'loading'];
  };

  return {
    link: link,
    template:
      '<md-button ng-click="openDialog()" aria-label="{{\'Back\' | translate }}" class="md-fab md-raised md-mini">' +
      '<md-tooltip md-direction="bottom">Templates</md-tooltip>' +
      '<md-icon md-font-icon="view_carousel">view_carousel</md-icon>' +
      '</md-button>'
  };
}]);

app.directive('splashGuide', ['Location', '$routeParams', '$location', '$http', '$compile', '$mdDialog', 'showToast', 'showErrors', 'gettextCatalog', 'SplashIntegration', function(Location, $routeParams, $location, $http, $compile, $mdDialog, showToast, showErrors, gettextCatalog, SplashIntegration) {

  var link = function(scope, element, attrs, controller) {
    scope.location = { slug: $routeParams.id };
    scope.currentNavItem = 'guide';
    scope.loading = undefined

    scope.createSplash = function() {
    };

  };

  return {
    link: link,
    templateUrl: 'components/splash_pages/_guide.html'
  };
}]);

app.directive('splashNav', [function() {

  var link = function(scope, element, attrs, controller) {
    // scope.location = { slug: $routeParams.id };
  };

  return {
    link: link,
    templateUrl: 'components/splash_pages/_nav.html'
  };

}]);
