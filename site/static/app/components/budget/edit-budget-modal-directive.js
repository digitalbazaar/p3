/*!
 * Edit Budget Modal.
 *
 * @author Dave Longley
 */
define(['angular'], function(angular) {

'use strict';

/* @ngInject */
function factory(
  AccountService, AlertService, BudgetService, IdentityService, config, util) {
  return {
    restrict: 'A',
    scope: {sourceBudget: '=psBudget'},
    require: '^stackable',
    templateUrl: '/app/components/budget/edit-budget-modal.html',
    link: Link
  };

  function Link(scope, element, attrs, stackable) {
    scope.model = {};
    scope.selection = {
      account: null
    };
    scope.identity = IdentityService.identity;
    scope.refreshChoices = [
      {label: 'Never', value: 'never'},
      {label: 'Hourly', value: 'PT1H'},
      {label: 'Daily', value: 'P1D'},
      {label: 'Weekly', value: 'P1W'},
      {label: 'Monthly', value: 'P1M'},
      {label: 'Yearly', value: 'P1Y'}
    ];
    scope.validityChoices = [
      {label: 'Current', value: ''},
      {label: 'Never', value: 'never'},
      {label: '1 month', value: 'P1M'},
      {label: '3 months', value: 'P3M'},
      {label: '6 months', value: 'P6M'},
      {label: '1 year', value: 'P1Y'}
    ];
    // copy source budget for editing
    scope.budget = {};
    angular.extend(scope.budget, scope.sourceBudget);
    // default to current value
    scope.model.budgetRefreshDuration = BudgetService.getRefreshDuration(
      scope.budget);
    scope.model.budgetValidDuration = '';

    scope.loading = true;
    AccountService.collection.get(scope.budget.source).then(function(account) {
      scope.selection.account = account;
      scope.loading = false;
    }).catch(function(err) {
      scope.loading = false;
      AlertService.add('error', err, {scope: scope});
    }).then(function() {
      scope.$apply();
    });

    scope.editBudget = function() {
      AlertService.clearFeedback();

      // set all fields from UI
      var b = scope.budget;

      // budget refresh duration
      if(scope.model.budgetRefreshDuration ===
        BudgetService.getRefreshDuration(scope.sourceBudget)) {
        b.sysRefreshInterval = undefined;
      } else if(scope.model.budgetRefreshDuration === 'never') {
        b.sysRefreshInterval = util.w3cDate();
      } else {
        b.sysRefreshInterval =
          'R/' + util.w3cDate() + '/' +
          scope.model.budgetRefreshDuration;
      }

      // budget valid duration
      if(scope.model.budgetValidDuration === '') {
        b.sysValidityInterval = undefined;
      } else {
        // set validity start date to now
        b.sysValidityInterval = util.w3cDate();
        if(scope.model.budgetValidDuration !== 'never') {
          // add duration
          b.sysValidityInterval += '/' + scope.model.budgetValidDuration;
        }
      }

      var budget = {
        '@context': config.data.contextUrl,
        id: b.id,
        type: 'Budget',
        label: b.label,
        source: scope.selection.account.id,
        amount: b.amount,
        // vendors not updated here
        //vendor: b.vendor,
        sysMaxPerUse: b.sysMaxPerUse,
        sysRefreshInterval: b.sysRefreshInterval,
        sysValidityInterval: b.sysValidityInterval
      };
      // remove fields not being updated
      angular.forEach(budget, function(value, key) {
        if(value === null || value === undefined || value.length === 0) {
          delete budget[key];
        }
      });

      scope.loading = true;
      BudgetService.collection.update(budget).then(function(budget) {
        scope.loading = false;
        stackable.close(null, budget);
      }).catch(function(err) {
        scope.loading = false;
        AlertService.add('error', err, {scope: scope});
        scope.$apply();
      });
    };
  }
}

return {psEditBudgetModal: factory};

});
