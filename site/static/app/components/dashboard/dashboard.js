/*!
 * Dashboard module.
 *
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 */
define([
  'angular',
  './dashboard-controller',
  './welcome-modal-directive',
  'bedrock/app/components/dashboard/dashboard-routes',
], function(
  angular,
  dashboardController,
  welcomeModalDirective,
  dashboardRoutes) {

'use strict';

var module = angular.module('app.dashboard', []);

module.controller(dashboardController);
module.directive(welcomeModalDirective);

/* @ngInject */
module.config(function($routeProvider) {
  angular.forEach(dashboardRoutes, function(route) {
    $routeProvider.when(route.path, route.options);
  });
});

return module.name;

});
