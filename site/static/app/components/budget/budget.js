/*!
 * Budget module.
 *
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 */
define([
  'angular',
  './budget-service',
  './budget-controller'
], function(angular, budgetService) {

'use strict';

var module = angular.module('app.budget', []);

module.service(budgetService);

});
