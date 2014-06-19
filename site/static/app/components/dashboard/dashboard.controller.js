/*!
 * Identity Dashboard.
 *
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 * @author David I. Lehn
 */
define([], function() {

var deps = [
  '$scope', '$timeout', 'config',
  'svcAccount', 'svcPaymentToken', 'svcBudget',
  'svcTransaction', 'svcIdentity'];
return {DashboardCtrl: deps.concat(factory)};

function factory(
  $scope, $timeout, config,
  svcAccount, svcPaymentToken, svcBudget, svcTransaction, svcIdentity) {
  var model = $scope.model = {};
  $scope.identity = svcIdentity.identity;
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
  model.expandAccountBalance = {};
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

  $scope.setDefaultAccount = function(account) {
    var update = {
      '@context': config.data.contextUrl,
      type: 'IdentityPreferences',
      source: account.id
    };

    svcIdentity.updatePreferences(
      $scope.identity.id, update,
      function(err) {
        // FIXME: show error feedback
        if(err) {
          console.error('setDefaultAccount error:', err);
        }
      });
  };

  $scope.getTxnType = svcTransaction.getType;

  // FIXME: token watch/update should be in the account service
  $scope.$watch('tokens', function(value) {
    svcAccount.updateAccounts();
  }, true);

  function refresh(force) {
    var opts = {force: !!force};
    svcAccount.collection.get(opts);
    svcPaymentToken.get(opts);
    svcBudget.get(opts);
    svcTransaction.getRecent(opts);
  }
  $scope.$on('refreshData', function() {
    refresh(true);
  });
  refresh();
}

});
