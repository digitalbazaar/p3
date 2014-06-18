/*!
 * Login module.
 *
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 */
define([
  'angular',
  './login.controller'
], function(angular, login) {

'use strict';

var module = angular.module('app.login', []);

module.controller(login);

});
