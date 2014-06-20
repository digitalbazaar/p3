/*!
 * Account module.
 *
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 */
define([
  'angular',
  './account.service',
  './activity.controller'
], function(angular, accountService, activityController) {

'use strict';

var module = angular.module('app.account', []);

module.service(accountService);
module.controller(activityController);

});
