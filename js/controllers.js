'use strict';

var controllerModule = angular.module('uchiwa.controllers', []);

/**
* Aggregate
*/
controllerModule.controller('aggregate', ['$http', '$rootScope', '$scope', '$routeParams', 'routingService', 'titleFactory',
  function ($http, $rootScope, $scope, $routeParams, routingService, titleFactory) {
    $scope.pageHeaderText = 'Aggregates';
    titleFactory.set($scope.pageHeaderText);

    // Services
    $scope.go = routingService.go;
    $scope.permalink = routingService.permalink;

    $scope.dcId = decodeURI($routeParams.dcId);
    $scope.checkId = decodeURI($routeParams.checkId);
    $scope.aggregate = null;

    $scope.$on('sensu', function() {
      $scope.check_aggregates = _.find($rootScope.aggregates, function(aggregate) { // jshint ignore:line
        return $scope.checkId === aggregate.check && $scope.dcId === aggregate.dc;
      });
    });

    var getAggregate = function () {
      if (isNaN($scope.issued)) {
        return;
      }

      $http.get('get_aggregate_by_issued?check=' + $scope.checkId + '&issued=' + $scope.issued + '&dc=' + $scope.dcId)
      .success(function(data) {
        $scope.aggregate = data;
      })
      .error(function(error) {
        console.log('Error: ' + JSON.stringify(error));
      });
    };

    // do we have a issued parameter? if so, display the aggregate result
    $scope.issued = decodeURI($routeParams.issued);
    getAggregate();
    $scope.$on('$routeUpdate', function(){
      $scope.issued = decodeURI($routeParams.issued);
      getAggregate();
    });
  }
]);

/**
* Aggregates
*/
controllerModule.controller('aggregates', ['filterService', '$routeParams', 'routingService', '$scope', 'titleFactory',
  function (filterService, $routeParams, routingService, $scope, titleFactory) {
    $scope.pageHeaderText = 'Aggregates';
    titleFactory.set($scope.pageHeaderText);

    $scope.predicate = 'check';

    // Routing
    $scope.filters = {};
    routingService.initFilters($routeParams, $scope.filters, ['dc', 'limit', 'q']);
    $scope.$on('$locationChangeSuccess', function(){
      routingService.updateFilters($routeParams, $scope.filters);
    });

    // Services
    $scope.filterComparator = filterService.comparator;
    $scope.go = routingService.go;
    $scope.permalink = routingService.permalink;
  }
]);

/**
* Checks
*/
controllerModule.controller('checks', ['filterService', '$routeParams', 'routingService', '$scope', 'titleFactory',
  function (filterService, $routeParams, routingService, $scope, titleFactory) {
    $scope.pageHeaderText = 'Checks';
    titleFactory.set($scope.pageHeaderText);

    $scope.predicate = 'name';

    // Helpers
    $scope.subscribersSummary = function(subscribers){
      return subscribers.join(' ');
    };

    // Routing
    $scope.filters = {};
    routingService.initFilters($routeParams, $scope.filters, ['dc', 'limit', 'q']);
    $scope.$on('$locationChangeSuccess', function(){
      routingService.updateFilters($routeParams, $scope.filters);
    });

    // Services
    $scope.filterComparator = filterService.comparator;
    $scope.permalink = routingService.permalink;

  }
]);

/**
* Client
*/
controllerModule.controller('client', ['backendService', 'clientsService', 'conf', 'notification', 'titleFactory', '$routeParams', 'routingService', '$scope','stashesService', 'userService',
  function (backendService, clientsService, conf, notification, titleFactory, $routeParams, routingService, $scope, stashesService, userService) {

    $scope.predicate = '-last_status';
    $scope.missingClient = false;

    // Retrieve client
    $scope.clientId = decodeURI($routeParams.clientId);
    $scope.dcId = decodeURI($routeParams.dcId);
    $scope.pull = function() {
      backendService.getClient($scope.clientId, $scope.dcId)
        .success(function (data) {
          $scope.$emit('client', data);
        })
        .error(function (error) {
          // Stop the pulling interval and set scope to display an error message
          clearTimeout(timer);
          $scope.missingClient = true;
          console.error('Error: '+ JSON.stringify(error));
        });
    };

    $scope.pull();
    var timer = setInterval($scope.pull, conf.refresh);

    $scope.$on('client', function (event, data) {
      $scope.client = data;
      $scope.pageHeaderText = $scope.client.name;

      // Retrieve check & event
      $scope.requestedCheck = decodeURI($routeParams.check);
      $scope.selectedCheck = getCheck($scope.requestedCheck, $scope.client.history);
      $scope.selectedEvent = getEvent($scope.client.name, $scope.requestedCheck, $scope.events);

      // Set page titleFactory
      if(angular.isDefined($scope.selectedCheck)) {
        titleFactory.set($scope.requestedCheck + ' - ' + $scope.client.name);
      }
      else {
        titleFactory.set($scope.client.name);
      }
    });

    // Routing
    $scope.$on('$routeUpdate', function(){
      // Retrieve check & event
      $scope.requestedCheck = decodeURI($routeParams.check);
      $scope.selectedCheck = getCheck($scope.requestedCheck, $scope.client.history);
      $scope.selectedEvent = getEvent($scope.client.name, $scope.requestedCheck, $scope.events);

      if(angular.isDefined($scope.selectedCheck)) {
        titleFactory.set($scope.requestedCheck + ' - ' + $scope.client.name);
      }
      else {
        titleFactory.set($scope.client.name);
      }
    });

    $scope.$on('$destroy', function() {
      clearInterval(timer);
    });

    // Sanitize - only display useful information 'acknowledged', 'dc', 'events', 'eventsSummary', 'history', 'status', 'timestamp'
    /* jshint ignore:start */
    var clientWhitelist = [ 'acknowledged', 'dc', 'events', 'eventsSummary', 'history', 'output', 'status', 'timestamp' ];
    var checkWhitelist = [ 'dc', 'hasSubscribers', 'name'];
    $scope.sanitizeObject = function(type, key){
      return eval(type + 'Whitelist').indexOf(key) === -1;
    };
    /* jshint ignore:end */

    // Services
    $scope.deleteClient = clientsService.deleteClient;
    $scope.resolveEvent = clientsService.resolveEvent;
    $scope.permalink = routingService.permalink;
    $scope.stash = stashesService.stash;
    $scope.user = userService;
    var getCheck = clientsService.getCheck;
    var getEvent = clientsService.getEvent;
  }
]);

/**
* Clients
*/
controllerModule.controller('clients', ['clientsService', '$filter', 'filterService', 'helperService', '$rootScope', '$routeParams', 'routingService', '$scope', 'stashesService', 'titleFactory', 'userService',
  function (clientsService, $filter, filterService, helperService, $rootScope, $routeParams, routingService, $scope, stashesService, titleFactory, userService) {
    $scope.pageHeaderText = 'Clients';
    titleFactory.set($scope.pageHeaderText);

    $scope.predicate = ['-status', 'name'];

    // Routing
    $scope.filters = {};
    routingService.initFilters($routeParams, $scope.filters, ['dc', 'subscription', 'limit', 'q']);
    $scope.$on('$locationChangeSuccess', function(){
      routingService.updateFilters($routeParams, $scope.filters);
    });

    // Services
    $scope.deleteClient = clientsService.deleteClient;
    $scope.filterComparator = filterService.comparator;
    $scope.go = routingService.go;
    $scope.permalink = routingService.permalink;
    $scope.stash = stashesService.stash;
    $scope.user = userService;

    $scope.selectClients = function(selectModel) {
      var filteredClients = $filter('filter')($rootScope.clients, $scope.filters.q);
      filteredClients = $filter('filter')(filteredClients, {dc: $scope.filters.dc});
      filteredClients = $filter('hideSilenced')(filteredClients, $scope.filters.silenced);
      _.each(filteredClients, function(client) {
        client.selected = selectModel.selected;
      });
    };

    $scope.deleteClients = function(clients) {
      var selectedClients = helperService.selectedItems(clients);
      _.each(selectedClients, function(client) {
        $scope.deleteClient(client.dc, client.name);
      });
    };

    $scope.silenceClients = function($event, clients) {
      var selectedClients = helperService.selectedItems(clients);
      $scope.stash($event, selectedClients);
    };

    $scope.$watch('filters.q', function(newVal) {
      var matched = $filter('filter')($rootScope.clients, '!'+newVal);
      _.each(matched, function(match) {
        match.selected = false;
      });
    });

    $scope.$watch('filters.dc', function(newVal) {
      var matched = $filter('filter')($rootScope.clients, {dc: '!'+newVal});
      _.each(matched, function(match) {
        match.selected = false;
      });
    });

    $scope.$watch('filters.silenced', function() {
      var matched = $filter('filter')($rootScope.clients, {acknowledged: true});
      _.each(matched, function(match) {
        match.selected = false;
      });
    });
  }
]);

/**
* Datacenters
*/
controllerModule.controller('datacenters', ['$scope', 'titleFactory',
  function ($scope, titleFactory) {
    $scope.pageHeaderText = 'Datacenters';
    titleFactory.set($scope.pageHeaderText);
  }
]);

/**
* Events
*/
controllerModule.controller('events', ['clientsService', 'conf', '$cookies', '$filter', 'filterService', 'helperService', '$rootScope', '$routeParams','routingService', '$scope', 'stashesService', 'titleFactory', 'userService',
  function (clientsService, conf, $cookies, $filter, filterService, helperService, $rootScope, $routeParams, routingService, $scope, stashesService, titleFactory, userService) {
    $scope.pageHeaderText = 'Events';
    titleFactory.set($scope.pageHeaderText);

    $scope.predicate = ['-check.status', '-check.issued'];
    $scope.filters = {};

    // Routing
    routingService.initFilters($routeParams, $scope.filters, ['dc', 'check', 'limit', 'q']);
    $scope.$on('$locationChangeSuccess', function(){
      routingService.updateFilters($routeParams, $scope.filters);
    });

    // Services
    $scope.filterComparator = filterService.comparator;
    $scope.go = routingService.go;
    $scope.permalink = routingService.permalink;
    $scope.resolveEvent = clientsService.resolveEvent;
    $scope.stash = stashesService.stash;
    $scope.user = userService;

    // Hide silenced
    $scope.filters.silenced = $cookies.get('hideSilenced') || conf.hideSilenced;
    $scope.$watch('filters.silenced', function () {
      $cookies.put('hideSilenced', $scope.filters.silenced);
    });

    // Hide events from silenced clients
    $scope.filters.clientSilenced = $cookies.get('hideClientSilenced') || conf.hideClientSilenced;
    $scope.$watch('filters.clientSilenced', function () {
      $cookies.put('hideClientSilenced', $scope.filters.clientSilenced);
    });

    // Hide occurrences
    $scope.filters.occurrences = $cookies.get('hideOccurrences') || conf.hideOccurrences;
    $scope.$watch('filters.occurrences', function () {
      $cookies.put('hideOccurrences', $scope.filters.occurrences);
    });

    $scope.selectEvents = function(selectModel) {
      var filteredEvents = $filter('filter')($rootScope.events, $scope.filters.q);
      filteredEvents = $filter('filter')(filteredEvents, $scope.filters.check);
      filteredEvents = $filter('filter')(filteredEvents, {dc: $scope.filters.dc});
      filteredEvents = $filter('hideSilenced')(filteredEvents, $scope.filters.silenced);
      filteredEvents = $filter('hideClientSilenced')(filteredEvents, $scope.filters.clientSilenced);
      filteredEvents = $filter('hideOccurrences')(filteredEvents, $scope.filters.occurrences);
      _.each(filteredEvents, function(event) {
        event.selected = selectModel.selected;
      });
    };

    $scope.resolveEvents = function(events) {
      var selectedEvents = helperService.selectedItems(events);
      _.each(selectedEvents, function(event) {
        $scope.resolveEvent(event.dc, event.client, event.check);
      });
      helperService.unselectItems(selectedEvents);
    };

    $scope.silenceEvents = function($event, events) {
      var selectedEvents = helperService.selectedItems(events);
      $scope.stash($event, selectedEvents);
      helperService.unselectItems(selectedEvents);
    };

    $scope.$watch('filters.q', function(newVal) {
      var matched = $filter('filter')($rootScope.events, '!'+newVal);
      _.each(matched, function(match) {
        match.selected = false;
      });
    });

    $scope.$watch('filters.dc', function(newVal) {
      var matched = $filter('filter')($rootScope.events, {dc: '!'+newVal});
      _.each(matched, function(match) {
        match.selected = false;
      });
    });

    $scope.$watch('filters.check', function(newVal) {
      var matched = $filter('filter')($rootScope.events, {check: '!'+newVal});
      _.each(matched, function(match) {
        match.selected = false;
      });
    });

    $scope.$watch('filters.silenced', function() {
      var matched = $filter('filter')($rootScope.events, {acknowledged: true});
      _.each(matched, function(match) {
        match.selected = false;
      });
    });

    $scope.$watch('filters.clientSilenced', function() {
      var matched = $filter('filter')($rootScope.events.client, {acknowledged: true});
      _.each(matched, function(match) {
        match.selected = false;
      });
    });

    $scope.$watch('filters.occurrences', function() {
      var matched = $filter('filter')($rootScope.events, function(event) {
        if (('occurrences' in event.check) && !isNaN(event.check.occurrences)) {
          return event.occurrences >= event.check.occurrences;
        } else {
          return true;
        }
      });
      _.each(matched, function(match) {
        match.selected = false;
      });
    });
  }
]);

/**
* Info
*/
controllerModule.controller('info', ['backendService', '$scope', 'titleFactory', 'version',
  function (backendService, $scope, titleFactory, version) {
    $scope.pageHeaderText = 'Info';
    titleFactory.set($scope.pageHeaderText);

    $scope.uchiwa = { version: version.uchiwa };
  }
]);

/**
* Login
*/
controllerModule.controller('login', [ 'backendService', '$cookies', '$location', 'notification', '$rootScope', '$scope',
function (backendService, $cookies, $location, notification, $rootScope, $scope) {

  $scope.login = {user: '', pass: ''};

  // get the authentication mode
  backendService.getConfigAuth()
    .success(function (data) {
      $scope.configAuth = data;
    })
    .error(function () {
      $scope.configAuth = 'simple';
    });

  $scope.submit = function () {
    backendService.login($scope.login)
    .success(function (data) {
      $cookies.put('uchiwa_auth', data);
      backendService.getConfig();
      $location.path('/');
    })
    .error(function () {
      notification('error', 'There was an error with your username/password combination. Please try again.');
    });
  };

  if (angular.isObject($rootScope.auth) || angular.isObject($rootScope.config)) {
    $location.path('/');
  }
}
]);

/**
* Navbar
*/
controllerModule.controller('navbar', ['$location', '$rootScope', '$scope', 'navbarServices', 'routingService', 'userService',
  function ($location, $rootScope, $scope, navbarServices, routingService, userService) {

    // Helpers
    $scope.getClass = function(path) {
      if ($location.path().substr(0, path.length) === path) {
        return 'selected';
      } else {
        return '';
      }
    };

    // Services
    $scope.go = routingService.go;
    $scope.logout = userService.logout;
    $scope.user = userService;
  }
]);

/**
* Settings
*/
controllerModule.controller('settings', ['$cookies', '$scope', 'titleFactory',
  function ($cookies, $scope, titleFactory) {
    $scope.pageHeaderText = 'Settings';
    titleFactory.set($scope.pageHeaderText);

    $scope.$watch('currentTheme', function (theme) {
      $scope.$emit('theme:changed', theme);
    });
  }
]);

/**
* Sidebar
*/
controllerModule.controller('sidebar', ['$location', 'navbarServices', '$scope', 'userService',
  function ($location, navbarServices, $scope, userService) {

    $scope.user = userService;

    // Get CSS class for sidebar elements
    $scope.getClass = function(path) {
      if ($location.path().substr(0, path.length) === path) {
        return 'selected';
      } else {
        return '';
      }
    };

    $scope.$on('sensu', function () {
      // Update badges
      navbarServices.countStatuses('clients', function (item) {
        return item.status;
      });
      navbarServices.countStatuses('events', function (item) {
        return item.check.status;
      });

      // Update alert badge
      navbarServices.health();
    });
  }
]);

/**
* Stashes
*/
controllerModule.controller('stashes', ['filterService', '$routeParams', 'routingService', '$scope', 'stashesService', 'titleFactory', 'userService',
  function (filterService, $routeParams, routingService, $scope, stashesService, titleFactory, userService) {
    $scope.pageHeaderText = 'Stashes';
    titleFactory.set($scope.pageHeaderText);

    $scope.predicate = 'client';
    $scope.deleteStash = stashesService.deleteStash;

    // Routing
    $scope.filters = {};
    routingService.initFilters($routeParams, $scope.filters, ['dc', 'limit', 'q']);
    $scope.$on('$locationChangeSuccess', function(){
      routingService.updateFilters($routeParams, $scope.filters);
    });

    // Services
    $scope.filterComparator = filterService.comparator;
    $scope.permalink = routingService.permalink;
    $scope.user = userService;
  }
]);

/**
* Stash Modal
*/
controllerModule.controller('StashModalCtrl', ['conf', '$filter', 'items', '$modalInstance', 'notification', '$scope', 'stashesService',
  function (conf, $filter, items, $modalInstance, notification, $scope, stashesService) {
    $scope.items = items;
    $scope.acknowledged = $filter('filter')(items, {acknowledged: true}).length;
    $scope.itemType = items[0].hasOwnProperty('client') ? 'check' : 'client';
    $scope.stash = { 'content': {} };
    $scope.stash.expirations = {
      '900': 900,
      '3600': 3600,
      '86400': 86400,
      'none': -1,
      'custom': 'custom'
    };
    $scope.stash.reason = '';
    $scope.stash.expiration = 900;
    $scope.stash.content.to = moment().add(1, 'h').format(conf.date);


    $scope.ok = function () {
      if ($scope.stash.expiration === 'custom') {
        if (angular.isUndefined($scope.stash.content.to)) {
          notification('error', 'Please enter a date for the custom expiration.');
          return false;
        }
        $scope.stash = stashesService.getExpirationFromDateRange($scope.stash);
      }
      _.each(items, function(item) {
        stashesService.submit(item, $scope.stash);
      });
      $modalInstance.close();
    };
    $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
    };

    // Services
    $scope.findStash = stashesService.find;
    $scope.getPath = stashesService.getPath;
  }
]);
