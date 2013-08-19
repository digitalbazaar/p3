/*!
 * Identity Settings.
 *
 * @author Dave Longley
 */
(function() {

define([], function() {

var name = 'ExternalAccountsCtrl';
var deps = ['$scope', 'svcPaymentToken'];
var factory = function($scope, svcPaymentToken) {
  $scope.state = svcPaymentToken.state;

  // types for UI directives
  $scope.allMethods = ['CreditCard', 'BankAccount'];
  $scope.creditCardMethods = ['CreditCard'];
  $scope.bankAccountMethods = ['BankAccount'];

  // service data
  $scope.creditCards = svcPaymentToken.creditCards;
  $scope.bankAccounts = svcPaymentToken.bankAccounts;

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
    });
  };
  $scope.restorePaymentToken = function(paymentToken) {
    svcPaymentToken.restore(paymentToken.id);
  };

  svcPaymentToken.get();
};

return {name: name, deps: deps, factory: factory};
});

})();
