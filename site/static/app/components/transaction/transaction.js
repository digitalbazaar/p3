/*!
 * Transaction module.
 *
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 */
define([
  'angular',
  './money-directive',
  './transaction-service',
  './transactions-directive'
], function(
  angular,
  moneyDirective,
  transactionService,
  transactionsDirective
) {

'use strict';

var module = angular.module('app.transaction', []);

module.directive(moneyDirective);
module.service(transactionService);
module.directive(transactionsDirective);

return module.name;

});
