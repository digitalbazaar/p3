/*!
 * Components module.
 *
 * Copyright (c) 2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 */
define([
  'angular',
  './account/account',
  './address/address',
  './budget/budget',
  './paymentToken/paymentToken',
  './promo/promo',
  './transaction/transaction',
  //'./settings/settings',
  'bedrock/app/components/dashboard/dashboard',
  'bedrock/app/components/duplicateChecker/duplicateChecker',
  'bedrock/app/components/fade/fade',
  'bedrock/app/components/feedback/feedback',
  'bedrock/app/components/identity/identity',
  'bedrock/app/components/key/key',
  'bedrock/app/components/login/login',
  'bedrock/app/components/modal/modal',
  'bedrock/app/components/navbar/navbar',
  'bedrock/app/components/passcode/passcode',
  'bedrock/app/components/placeholder/placeholder',
  'bedrock/app/components/popoverTemplate/popoverTemplate',
  'bedrock/app/components/selector/selector',
  'bedrock/app/components/slug/slug',
  'bedrock/app/components/spinner/spinner',
  'bedrock/app/components/submitForm/submitForm',
  'bedrock/app/components/tabs/tabs',
  'bedrock/app/components/util/util'
], function(angular) {

'use strict';

angular.module('app.components', [
  'app.account',
  'app.address',
  'app.budget',
  'app.dashboard',
  'app.duplicateChecker',
  'app.fade',
  'app.feedback',
  'app.identity',
  'app.key',
  'app.login',
  'app.modal',
  'app.navbar',
  'app.passcode',
  'app.paymentToken',
  'app.placeholder',
  'app.popoverTemplate',
  'app.promo',
  'app.selector',
  //'app.settings',
  'app.slug',
  'app.spinner',
  'app.submitForm',
  'app.tabs',
  'app.transaction',
  'app.util'
]);

});
