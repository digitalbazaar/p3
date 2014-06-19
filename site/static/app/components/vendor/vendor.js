/*!
 * Vendor module.
 *
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 */
define([
  'angular',
  './register.controller'
], function(angular, register) {

'use strict';

var module = angular.module('app.vendor', []);

module.controller(register);

});
