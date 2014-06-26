/*!
 * Account module.
 *
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 */
define([
  'angular',
  './account-balance-directive',
  './account-balance-summary-directive',
  './account-controller',
  './account-selector-directive',
  './account-service',
  './activity-controller',
  './add-account-modal-directive',
  './add-credit-line-modal-directive',
  './deposit-modal-directive',
  './edit-account-modal-directive',
  './update-account-button-directive',
  './withdraw-modal-directive'
], function(
  angular,
  accountBalanceDirective,
  accountBalanceSummaryDirective,
  accountController,
  accountSelectorDirective,
  accountService,
  activityController,
  addAccountModalDirective,
  addCreditLineModalDirective,
  depositModalDirective,
  editAccountModalDirective,
  updateAccountButtonDirective,
  withdrawModalDirective
) {

'use strict';

var module = angular.module('app.account', []);

module.service(accountService);
module.controller(activityController);

module.directive(accountBalanceDirective);
module.directive(accountBalanceSummaryDirective);
module.controller(accountController);
module.directive(accountSelectorDirective);
module.service(accountService);
module.controller(activityController);
module.directive(addAccountModalDirective);
module.directive(addCreditLineModalDirective);
module.directive(depositModalDirective);
module.directive(editAccountModalDirective);
module.directive(updateAccountButtonDirective);
module.directive(withdrawModalDirective);

return module.name;

});
