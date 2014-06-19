/*!
 * Transaction module.
 *
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 */
define([
  'angular',
  './transaction.service'
], function(angular, transactionService) {

'use strict';

var module = angular.module('app.transaction', []);

module.service(transactionService);

});
