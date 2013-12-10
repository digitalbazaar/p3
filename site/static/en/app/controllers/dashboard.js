/*!
 * Identity Dashboard.
 *
 * @author Dave Longley
 * @author David I. Lehn
 */
define(['angular'], function(angular) {

var deps = ['$scope', 'svcAccount', 'svcPaymentToken', 'svcBudget',
  'svcTransaction', '$timeout'];
return {DashboardCtrl: deps.concat(factory)};

function factory($scope, svcAccount, svcPaymentToken, svcBudget,
  svcTransaction, $timeout) {
  $scope.model = {};
  var data = window.data || {};
  $scope.profile = data.session.profile;
  $scope.identity = data.identity;
  $scope.accounts = svcAccount.accounts;
  $scope.budgets = svcBudget.budgets;
  $scope.txns = svcTransaction.recentTxns;
  $scope.tokens = svcPaymentToken.paymentTokens;
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

  // FIXME: token watch/update should be in the account service
  $scope.$watch('tokens', function(value) {
    svcAccount.updateAccounts();
  }, true);

  svcAccount.get({force: true});
  svcPaymentToken.get({force: true});
  svcBudget.get({force: true});
  svcTransaction.getRecent({force: true});
}

});
