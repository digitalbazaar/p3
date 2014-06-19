/*!
 * System module.
 *
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 */
define([
  'angular',
  './dashboard.controller'
], function(angular, dashboard) {

'use strict';

var module = angular.module('app.system', []);

module.controller(dashboard);

});
