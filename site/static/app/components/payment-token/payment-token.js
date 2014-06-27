/*!
 * PaymentToken module.
 *
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 */
define([
  'angular',
  './add-payment-token-modal-directive',
  './card-brand-filter',
  './cc-number-filter',
  './credit-card-selector-directive',
  './edit-payment-token-modal-directive',
  './kredit-directive',
  './payment-token-list-directive',
  './payment-token-list-selector-modal-directive',
  './payment-token-selector-directive',
  './payment-token-service',
  './verify-bank-account-modal-directive'
], function(
  angular,
  addPaymentTokenModalDirective,
  cardBrandFilter,
  ccNumberFilter,
  creditCardSelectorDirective,
  editPaymentTokenModalDirective,
  kreditDirective,
  paymentTokenListDirective,
  paymentTokenListSelectorModalDirective,
  paymentTokenSelectorDirective,
  paymentTokenService,
  verifyBankAccountModalDirective) {

'use strict';

var module = angular.module('app.paymentToken', []);

module.directive(addPaymentTokenModalDirective);
module.filter(cardBrandFilter);
module.filter(ccNumberFilter);
module.directive(creditCardSelectorDirective);
module.directive(kreditDirective);
module.directive(editPaymentTokenModalDirective);
module.directive(paymentTokenListDirective);
module.directive(paymentTokenListSelectorModalDirective);
module.directive(paymentTokenSelectorDirective);
module.service(paymentTokenService);
module.directive(verifyBankAccountModalDirective);

return module.name;

});
