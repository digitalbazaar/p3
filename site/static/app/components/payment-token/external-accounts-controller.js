/*!
 * Identity Settings.
 *
 * @author Dave Longley
 */
define([], function() {

'use strict';

/* @ngInject */
function factory($scope, brAlertService, psPaymentTokenService) {
  var self = this;

  self.state = psPaymentTokenService.state;

  // types for UI directives
  self.allMethods = ['CreditCard', 'BankAccount'];
  self.creditCardMethods = ['CreditCard'];
  self.bankAccountMethods = ['BankAccount'];

  // service data
  self.creditCards = psPaymentTokenService.creditCards;
  self.bankAccounts = psPaymentTokenService.bankAccounts;

  // modals
  self.modals = {
    showAddCreditCard: false,
    showAddBankAccount: false
  };

  self.deletePaymentToken = function(paymentToken) {
    paymentToken.deleted = true;
    psPaymentTokenService.collection.del(paymentToken.id, {update: false})
      .catch(function(err) {
        brAlertService.add('error', err);
        paymentToken.deleted = false;
        $scope.apply();
      })
      .then(function() {
        // get token again since deletion is not immediate
        return psPaymentTokenService.collection.get(paymentToken.id, {force: true});
      });
  };
  self.restorePaymentToken = function(paymentToken) {
    psPaymentTokenService.restore(paymentToken.id);
  };

  psPaymentTokenService.collection.getAll();
}

return {ExternalAccountsController: factory};

});
