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
  './transaction-details-directive',
  './transactions-directive'
], function(
  angular,
  moneyDirective,
  transactionService,
  transactionDetailsDirective,
  transactionsDirective
) {

'use strict';

var module = angular.module('app.transaction', []);

module.directive(moneyDirective);
module.service(transactionService);
module.directive(transactionDetailsDirective);
module.directive(transactionsDirective);

return module.name;

});
