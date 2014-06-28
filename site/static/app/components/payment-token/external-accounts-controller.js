/*!
 * Identity Settings.
 *
 * @author Dave Longley
 */
define([], function() {

var deps = ['$timeout', 'PaymentTokenService'];
return {ExternalAccountsController: deps.concat(factory)};

function factory($timeout, PaymentTokenService) {
  var self = this;

  self.state = PaymentTokenService.state;

  // types for UI directives
  self.allMethods = ['CreditCard', 'BankAccount'];
  self.creditCardMethods = ['CreditCard'];
  self.bankAccountMethods = ['BankAccount'];

  // service data
  self.creditCards = PaymentTokenService.creditCards;
  self.bankAccounts = PaymentTokenService.bankAccounts;

  // feedback
  self.creditCardFeedback = {};
  self.bankAccountFeedback = {};

  // modals
  self.modals = {
    showAddCreditCard: false,
    showAddBankAccount: false
  };

  self.deletePaymentToken = function(paymentToken) {
    PaymentTokenService.del(paymentToken.id, function(err) {
      if(err) {
        $timeout(function() {
          paymentToken.deleted = false;
          paymentToken.showDeletedError = true;
        }, 500);
      }
      // reset feedback and update based on type
      self.creditCardFeedback.error = null;
      self.bankAccountFeedback.error = null;

      if(paymentToken.paymentMethod === 'CreditCard') {
        self.creditCardFeedback.error = err;
      } else if(paymentToken.paymentMethod === 'BankAccount') {
        self.bankAccountFeedback.error = err;
      }
    });
  };
  self.restorePaymentToken = function(paymentToken) {
    PaymentTokenService.restore(paymentToken.id);
  };
  self.clearDeletedError = function(paymentToken) {
    delete paymentToken.showDeletedError;
  };

  PaymentTokenService.collection.getAll();
}

});
