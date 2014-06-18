/*!
 * Key module.
 *
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 */
define([
  'angular',
  './key.controller'
], function(angular, key) {

'use strict';

var module = angular.module('app.key', []);

module.controller(key);

});
