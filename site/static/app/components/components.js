/*!
 * Components module.
 *
 * Copyright (c) 2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 */
define([
  'angular',
  'bedrock-idp',
  './account/account',
  './address/address',
  './budget/budget',
  './dashboard/dashboard',
  './identity-preferences/identity-preferences',
  './payment-token/payment-token',
  './promo/promo',
  './purchase/purchase',
  './transaction/transaction',
  './vendor/vendor'
], function(angular) {

'use strict';

var module = angular.module(
  'app.p3', Array.prototype.slice.call(arguments, 1));

/* @ngInject */
module.run(function(config) {
  config.settings.panes.push({
    templateUrl: requirejs.toUrl(
      'p3/components/address/address-settings.html')
  });
  config.settings.panes.push({
    templateUrl: requirejs.toUrl(
      'p3/components/payment-token/external-account-settings.html')
  });
});

return module.name;

});
