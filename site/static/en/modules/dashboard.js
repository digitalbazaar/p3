/*!
 * Identity Dashboard
 *
 * @author Dave Longley
 * @author David I. Lehn
 */
(function() {

var module = angular.module('payswarm');

module.controller('DashboardCtrl', function($scope, svcAccount, svcBudget) {
  // initialize model
  var data = window.data || {};
  $scope.identity = data.identity;
  $scope.accounts = svcAccount.accounts;
  $scope.budgets = svcBudget.budgets;
  $scope.txns = [];
  $scope.state = {
    accounts: svcAccount.state,
    budgets: svcBudget.state,
    txns: {loading: true}
  };

  $scope.deposit = function(account) {
    window.modals.deposit.show({
      identity: $scope.identity,
      account: account.id,
      deposited: function() {
        svcAccount.get({force: true}, function() {
          $scope.$apply();
        });
      }
    });
  };

  $scope.deleteBudget = function(budget) {
    budget.deleted = true;
    svcBudget.del(budget.id, function(err) {
      if(err) {
        budget.deleted = false;
      }
      $scope.$apply();
    });
  };

  // FIXME reuse from transactions.js?
  $scope.getTxnType = function(row) {
    if(row.type.indexOf('com:Deposit') !== -1) {
      return 'deposit';
    }
    else if(row.type.indexOf('ps:Contract') !== -1) {
      return 'contract';
    }
    else if(row.type.indexOf('com:Withdrawal') !== -1) {
      return 'withdrawal';
    }
    else {
      return 'error';
    }
  };

  svcAccount.get({force: true}, function() {
    $scope.$apply();
  });
  svcBudget.get({force: true}, function() {
    $scope.$apply();
  });
  updateTxns($scope);
});

function updateTxns($scope) {
  $scope.state.txns.loading = true;
  // FIXME: remove
  $scope.txns = [];
  payswarm.transactions.get({
    // FIXME: make date ordering explicit
    identity: $scope.identity,
    limit: 10,
    success: function(txns) {
      $scope.txns = txns;
      $scope.state.txns.loading = false;
      $scope.$apply();
    },
    error: function(err) {
      console.error('updateTxns:', err);
      $scope.state.txns.loading = false;
      $scope.$apply();
    }
  });
}

})();
