/*!
 * Account module.
 *
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 */
define([
  'angular',
  './account.service'
], function(angular, accountService) {

'use strict';

var module = angular.module('app.account', []);

module.service(accountService);

});
