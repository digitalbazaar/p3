/*!
 * Budget module.
 *
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 */
define([
  'angular',
  './add-budget-modal-directive',
  './budget-bar-directive',
  './budget-controller',
  './budget-routes',
  './budget-selector-directive',
  './budget-service',
  './budgets-directive',
  './edit-budget-modal-directive'
], function(
  angular,
  addBudgetModalDirective,
  budgetBarDirective,
  budgetController,
  budgetRoutes,
  budgetSelectorDirective,
  budgetService,
  budgetsDirective,
  editBudgetModalDirective
) {

'use strict';

var module = angular.module('app.budget', []);

module.directive(addBudgetModalDirective);
module.directive(budgetBarDirective);
module.controller(budgetController);
module.directive(budgetSelectorDirective);
module.service(budgetService);
module.directive(budgetsDirective);
module.directive(editBudgetModalDirective);

module.config(['$routeProvider',
  function($routeProvider) {
    angular.forEach(budgetRoutes, function(route) {
      $routeProvider.when(route.path, route.options);
    });
  }
]);

return module.name;

});
