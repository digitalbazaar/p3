/*!
 * Identity Settings.
 *
 * @author Dave Longley
 */
define([], function() {

var deps = ['$scope', 'svcPaymentToken'];
return {ExternalAccountsCtrl: deps.concat(factory)};

function factory($scope, svcPaymentToken) {
  $scope.state = svcPaymentToken.state;

  // types for UI directives
  $scope.allMethods = ['CreditCard', 'BankAccount'];
  $scope.creditCardMethods = ['CreditCard'];
  $scope.bankAccountMethods = ['BankAccount'];

  // service data
  $scope.creditCards = svcPaymentToken.creditCards;
  $scope.bankAccounts = svcPaymentToken.bankAccounts;

  // feedback
  $scope.creditCardFeedback = {};
  $scope.bankAccountFeedback = {};

  // modals
  $scope.modals = {
    showAddCreditCard: false,
    showAddBankAccount: false
  };

  $scope.deletePaymentToken = function(paymentToken) {
    svcPaymentToken.del(paymentToken.id, function(err) {
      if(err) {
        paymentToken.deleted = false;
      }
      // reset feedback and update based on type
      $scope.creditCardFeedback.error = null;
      $scope.bankAccountFeedback.error = null;

      if(paymentToken.paymentMethod === 'CreditCard') {
        $scope.creditCardFeedback.error = err;
      }
      else if(paymentToken.paymentMethod === 'BankAccount') {
        $scope.bankAccountFeedback.error = err;
      }
    });
  };
  $scope.restorePaymentToken = function(paymentToken) {
    svcPaymentToken.restore(paymentToken.id);
  };
  $scope.clearDeletedFlag = function(paymentToken) {
    delete paymentToken.deleted;
  };

  svcPaymentToken.get();
}

});
