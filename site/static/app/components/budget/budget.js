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
  './budget-controller',
  './budget-selector-directive',
  './budget-service',
  './edit-budget-modal-directive'
], function(
  angular,
  addBudgetModalDirective,
  budgetController,
  budgetSelectorDirective,
  budgetService,
  editBudgetModalDirective
) {

'use strict';

var module = angular.module('app.budget', []);

module.directive(addBudgetModalDirective);
module.controller(budgetController);
module.directive(budgetSelectorDirective);
module.service(budgetService);
module.directive(editBudgetModalDirective);

});
