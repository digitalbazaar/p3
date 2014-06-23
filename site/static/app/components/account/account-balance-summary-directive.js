/*!
 * Account Balance Summary directive. To be paired w/Account Balance Details.
 *
 * @author Dave Longley
 */
define([], function() {

var deps = [];
return {accountBalanceSummary: deps.concat(factory)};

function factory() {
  return {
    scope: {
      account: '=accountBalanceSummary',
      expand: '='
    },
    replace: true,
    templateUrl: '/app/components/account/account-balance-summary.html',
    controller: ['$scope', function($scope) {
      $scope.model = {};
    }],
    link: function(scope, element, attrs) {
      var model = scope.model;
      scope.$watch('account', function(account) {
        // get balance and credit limit
        model.balance = parseFloat(account ? account.balance : 0);
        model.creditLimit = parseFloat(
          account ? account.creditLimit || '0' : 0);

        // calculate remaining credit
        model.remainingCredit = model.creditLimit;
        if(model.balance < 0) {
          model.remainingCredit = model.creditLimit + model.balance;
        }

        // get total balance (includes remaining credit)
        model.totalBalance = model.remainingCredit;
        if(model.balance > 0) {
          model.totalBalance += model.balance;
        }
      }, true);
    }
  };
}

});
