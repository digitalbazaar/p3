/*!
 * Identity Settings.
 *
 * @author Dave Longley
 */
define([], function() {

'use strict'; 

/* @ngInject */
function factory($timeout, AlertService, PaymentTokenService) {
  var self = this;

  self.state = PaymentTokenService.state;

  // types for UI directives
  self.allMethods = ['CreditCard', 'BankAccount'];
  self.creditCardMethods = ['CreditCard'];
  self.bankAccountMethods = ['BankAccount'];

  // service data
  self.creditCards = PaymentTokenService.creditCards;
  self.bankAccounts = PaymentTokenService.bankAccounts;

  // modals
  self.modals = {
    showAddCreditCard: false,
    showAddBankAccount: false
  };

  self.deletePaymentToken = function(paymentToken) {
    PaymentTokenService.collection.del(paymentToken.id).catch(function(err) {
      AlertService.add('error', err);
      $timeout(function() {
        paymentToken.deleted = false;
        paymentToken.showDeletedError = true;
      }, 500);
    });
  };
  self.restorePaymentToken = function(paymentToken) {
    PaymentTokenService.restore(paymentToken.id);
  };

  PaymentTokenService.collection.getAll();
}

return {ExternalAccountsController: factory};

});
