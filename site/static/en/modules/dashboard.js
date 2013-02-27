/*!
 * Identity Dashboard
 *
 * @author Dave Longley
 * @author David I. Lehn
 */
(function() {

var module = angular.module('payswarm');

module.controller('DashboardCtrl', function(
  $scope, svcAccount, svcBudget, svcTransaction, $timeout) {
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
  $scope.getBudgetRefreshDuration = svcBudget.getRefreshDuration;
  $scope.deleteBudget = function(budget) {
    $scope.showDeleteBudgetAlert = true;
    $scope.budgetToDelete = budget;
  };
  $scope.confirmDeleteBudget = function(err, result) {
    // FIXME: handle errors
    if(!err && result === 'ok') {
      var budget = $scope.budgetToDelete;
      budget.deleted = true;

      // wait to delete so modal can transition
      $timeout(function() {
        svcBudget.del(budget.id, function(err) {
          if(err) {
            budget.deleted = false;
          }
        });
      }, 400);
    }
    $scope.budgetToDelete = null;
  };

  $scope.getTxnType = svcTransaction.getType;

  svcAccount.get({force: true});
  svcBudget.get({force: true});
  svcTransaction.getRecent({force: true});
});

})();
