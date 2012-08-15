/*!
 * Identity Dashboard
 *
 * @author Dave Longley
 * @author David I. Lehn
 */
(function() {

var module = angular.module('dashboard', ['spinner']).
run(function() {
});

module.controller('DashboardCtrl', function($scope) {
  // initialize model
  var data = window.data || {};
  $scope.identity = data.identity;
  $scope.accounts = [];
  $scope.budgets = [];
  $scope.loading = {
    accounts: true,
    budgets: true
  };

  $scope.addAccount = function(account) {
    window.modals.addAccount.show({
      identity: $scope.identity,
      added: function() {
        updateAccounts($scope);
      }
    });
  };
  $scope.editAccount = function(account) {
    window.modals.editAccount.show({
      identity: $scope.identity,
      account: account.id,
      success: function() {
        updateAccounts($scope);
      }
    });
  };
  $scope.deposit = function(account) {
    window.modals.deposit.show({
      identity: $scope.identity,
      account: account.id,
      deposited: function() {
        updateAccounts($scope);
      }
    });
  };

  $scope.addBudget = function(budget) {
    window.modals.addBudget.show({
      identity: $scope.identity,
      added: function() {
        updateBudgets($scope);
      }
    });
  };
  $scope.editBudget = function(budget) {
    window.modals.editBudget.show({
      identity: $scope.identity,
      budget: budget.id,
      success: function() {
        updateBudgets($scope);
      }
    });
  };
  $scope.deleteBudget = function(budget) {
    // FIXME: do fade out via a directive?
    // (when fadeout expression is true do element.fadeOut)
    payswarm.budgets.del({
      budget: budget.id,
      success: function() {
        updateBudgets($scope);
      },
      error: function(err) {
        console.error('deleteBudget:', err);
      }
    });
  };

  updateAccounts($scope);
  updateBudgets($scope);
});

function updateAccounts($scope) {
  $scope.loading.accounts = true;
  payswarm.accounts.get({
    identity: $scope.identity,
    success: function(accounts) {
      $scope.accounts = accounts;
      $scope.loading.accounts = false;
      $scope.$apply();
    },
    error: function(err) {
      console.error('updateAccounts:', err);
      $scope.loading.accounts = false;
      $scope.$apply();
    }
  });
}

function updateBudgets($scope) {
  $scope.loading.budgets = true;
  payswarm.budgets.get({
    identity: $scope.identity,
    success: function(budgets) {
      $scope.budgets = budgets;
      $scope.loading.budgets = false;
      $scope.$apply();
    },
    error: function(err) {
      console.error('updateBudgets:', err);
      $scope.loading.budgets = false;
      $scope.$apply();
    }
  });
}

})();
