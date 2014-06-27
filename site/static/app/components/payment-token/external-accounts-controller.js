/*!
 * Identity Settings.
 *
 * @author Dave Longley
 */
define([], function() {

var deps = ['$scope', '$timeout', 'PaymentTokenService'];
return {ExternalAccountsController: deps.concat(factory)};

function factory($scope, $timeout, PaymentTokenService) {
  $scope.state = PaymentTokenService.state;

  // types for UI directives
  $scope.allMethods = ['CreditCard', 'BankAccount'];
  $scope.creditCardMethods = ['CreditCard'];
  $scope.bankAccountMethods = ['BankAccount'];

  // service data
  $scope.creditCards = PaymentTokenService.creditCards;
  $scope.bankAccounts = PaymentTokenService.bankAccounts;

  // feedback
  $scope.creditCardFeedback = {};
  $scope.bankAccountFeedback = {};

  // modals
  $scope.modals = {
    showAddCreditCard: false,
    showAddBankAccount: false
  };

  $scope.deletePaymentToken = function(paymentToken) {
    PaymentTokenService.del(paymentToken.id, function(err) {
      if(err) {
        $timeout(function() {
          paymentToken.deleted = false;
          paymentToken.showDeletedError = true;
        }, 500);
      }
      // reset feedback and update based on type
      $scope.creditCardFeedback.error = null;
      $scope.bankAccountFeedback.error = null;

      if(paymentToken.paymentMethod === 'CreditCard') {
        $scope.creditCardFeedback.error = err;
      } else if(paymentToken.paymentMethod === 'BankAccount') {
        $scope.bankAccountFeedback.error = err;
      }
    });
  };
  $scope.restorePaymentToken = function(paymentToken) {
    PaymentTokenService.restore(paymentToken.id);
  };
  $scope.clearDeletedError = function(paymentToken) {
    delete paymentToken.showDeletedError;
  };

  PaymentTokenService.collection.getAll();
}

});
