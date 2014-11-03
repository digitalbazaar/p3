/*!
 * Transaction module.
 *
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 */
define([
  'angular',
  './money-directive',
  './transaction-controller',
  './transaction-service',
  './transaction-details-directive',
  './transaction-routes',
  './transactions-directive'
], function(
  angular,
  moneyDirective,
  transactionController,
  transactionService,
  transactionDetailsDirective,
  transactionRoutes,
  transactionsDirective
) {

'use strict';

var module = angular.module('app.transaction', []);

module.directive(moneyDirective);
module.controller(transactionController);
module.service(transactionService);
module.directive(transactionDetailsDirective);
module.directive(transactionsDirective);

/* @ngInject */
module.config(function($routeProvider) {
  angular.forEach(transactionRoutes, function(route) {
    $routeProvider.when(route.path, route.options);
  });
});

return module.name;

});
