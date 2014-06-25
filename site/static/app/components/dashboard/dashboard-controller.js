/*!
 * Identity Dashboard.
 *
 * Copyright (c) 20122014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 * @author David I. Lehn
 */
define([], function() {

var deps = [
  '$scope', 'AccountService', 'AlertService',
  'BudgetService', 'IdentityService',
  'PaymentTokenService', 'TransactionService', 'config'];
return {DashboardCtrl: deps.concat(factory)};

function factory(
  $scope, AccountService, AlertService, BudgetService, IdentityService,
  PaymentTokenService, TransactionService, config) {
  var model = $scope.model = {};
  $scope.identity = IdentityService.identity;
  $scope.accounts = AccountService.accounts;
  $scope.budgets = BudgetService.budgets;
  $scope.txns = TransactionService.recentTxns;
  $scope.tokens = PaymentTokenService.paymentTokens;
  $scope.state = {
    accounts: AccountService.state,
    budgets: BudgetService.state,
    txns: TransactionService.state
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
  $scope.getBudgetRefreshDuration = BudgetService.getRefreshDuration;
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
      BudgetService.del(budget.id, {delay: 400}).catch(function(err) {
        AlertService.add('error', err);
        budget.deleted = false;
      });
    }
    $scope.budgetToDelete = null;
  };

  $scope.setDefaultAccount = function(account) {
    var update = {
      '@context': config.data.contextUrl,
      type: 'IdentityPreferences',
      source: account.id
    };

    IdentityService.updatePreferences(
      $scope.identity.id, update,
      function(err) {
        // FIXME: show error feedback
        if(err) {
          console.error('setDefaultAccount error:', err);
        }
      });
  };

  $scope.getTxnType = TransactionService.getType;

  // FIXME: token watch/update should be in the account service
  $scope.$watch('tokens', function(value) {
    AccountService.updateAccounts();
  }, true);

  function refresh(force) {
    var opts = {force: !!force};
    AccountService.collection.getAll(opts);
    PaymentTokenService.collection.getAll(opts);
    BudgetService.collection.getAll(opts);
    TransactionService.getRecent(opts);
  }
  $scope.$on('refreshData', function() {
    refresh(true);
  });
  refresh();
}

});
