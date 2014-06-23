/*!
 * Purchase module.
 *
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 */
define([
  'angular',
  './purchase-controller'
], function(angular, purchaseController) {

'use strict';

var module = angular.module('app.purchase', []);

module.controller(purchaseController);

});
