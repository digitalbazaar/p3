/*!
 * Directives module.
 *
 * @author Dave Longley
 */
(function() {

define([
  'angular',
  'directives/accountSelector',
  'directives/addressSelector',
  'directives/budgetBar',
  'directives/budgetSelector',
  'directives/creditCardSelector',
  'directives/duplicateChecker',
  'directives/fadein',
  'directives/fadeout',
  'directives/fadeToggle',
  'directives/feedback',
  'directives/focusToggle',
  'directives/helpToggle',
  'directives/identitySelector',
  'directives/inputWatcher',
  'directives/kredit',
  'directives/modalAddAccount',
  'directives/modalAddAddress',
  'directives/modalAddBudget',
  'directives/modalAddIdentity',
  'directives/modalAddListing',
  'directives/modalAddPaymentToken',
  'directives/modalAlert',
  'directives/modalDeposit',
  'directives/modalEditAccount',
  'directives/modalEditBudget',
  'directives/modalEditKey',
  'directives/modalProtectAsset',
  'directives/modalRedeemPromoCode',
  'directives/modalSelector',
  'directives/modalSwitchIdentity',
  'directives/modalVerifyBankAccount',
  'directives/modalWithdraw',
  'directives/mouseoverToggle',
  'directives/ngBlur',
  'directives/ngFocus',
  'directives/paymentTokenSelector',
  'directives/placeholder',
  'directives/popoverTemplate',
  'directives/promoCodeChecker',
  'directives/selector',
  'directives/slugIn',
  'directives/slugOut',
  'directives/spinner',
  'directives/submitForm',
  'directives/tooltipTitle',
  'directives/trackState',
  'directives/vcardAddress'
], function(angular) {
  // FIXME: simplify filter boilerplate to eliminate loop here
  // FIXME: use app.directives?
  var module = angular.module('app.directives', []);
  var directives = Array.prototype.slice.call(arguments, 1);
  angular.forEach(directives, function(directive) {
    module.directive(directive.name, directive.deps.concat(directive.factory));
  });
});

})();
