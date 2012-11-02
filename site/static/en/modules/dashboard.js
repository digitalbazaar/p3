/*!
 * Identity Dashboard
 *
 * @author Dave Longley
 * @author David I. Lehn
 */
(function() {

var module = angular.module('payswarm');

module.controller('DashboardCtrl', function(
  $scope, svcAccount, svcBudget, svcTransaction) {
  $scope.model = {};
  var data = window.data || {};
  $scope.identity = data.identity;
  $scope.accounts = svcAccount.accounts;
  $scope.budgets = svcBudget.budgets;
  $scope.txns = svcTransaction.recentTxns;
  $scope.state = {
    accounts: svcAccount.state,
    budgets: svcBudget.state,
    txns: svcTransaction.state
  };
  $scope.modals = {
    showDeposit: false,
    showWithdraw: false,
    showEditAccount: false,
    showAddAccount: false,
    showEditBudget: false,
    showAddBudget: false,
    account: null,
    budget: null
  };
  $scope.deleteBudget = function(budget) {
    svcBudget.del(budget.id, function(err) {
      if(err) {
        budget.deleted = false;
      }
    });
  };

  $scope.getTxnType = svcTransaction.getType;

  svcAccount.get({force: true});
  svcBudget.get({force: true});
  svcTransaction.getRecent({force: true});
});

})();
