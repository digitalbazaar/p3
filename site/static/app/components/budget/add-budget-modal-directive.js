/*!
 * Add Budget Modal.
 *
 * @author Dave Longley
 */
define([], function() {

'use strict';

/* @ngInject */
function factory(
  brAlertService, psBudgetService, brIdentityService, config, util) {
  return {
    restrict: 'A',
    scope: {},
    require: '^stackable',
    templateUrl: requirejs.toUrl('p3/components/budget/add-budget-modal.html'),
    link: Link
  };

  function Link(scope, element, attrs, stackable) {
    scope.model = {};
    scope.selection = {
      account: null
    };
    scope.identity = brIdentityService.identity;
    scope.state = psBudgetService.state;
    scope.budget = {
      '@context': config.data.contextUrls.payswarm,
      type: 'Budget'
    };
    scope.refreshChoices = [
      {label: 'Never', value: 'never'},
      {label: 'Hourly', value: 'PT1H'},
      {label: 'Daily', value: 'P1D'},
      {label: 'Weekly', value: 'P1W'},
      {label: 'Monthly', value: 'P1M'},
      {label: 'Yearly', value: 'P1Y'}
    ];
    scope.validityChoices = [
      {label: 'Never', value: 'never'},
      {label: '1 month', value: 'P1M'},
      {label: '3 months', value: 'P3M'},
      {label: '6 months', value: 'P6M'},
      {label: '1 year', value: 'P1Y'}
    ];
    scope.model.budgetRefreshDuration = 'never';
    scope.model.budgetValidDuration = 'never';

    scope.addBudget = function() {
      brAlertService.clearFeedback();

      // budget refresh duration
      if(scope.model.budgetRefreshDuration !== 'never') {
        scope.budget.sysRefreshInterval =
          'R/' + util.w3cDate() + '/' +
          scope.model.budgetRefreshDuration;
      }

      // set budget validity start date to now
      scope.budget.sysValidityInterval = util.w3cDate();
      if(scope.model.budgetValidDuration !== 'never') {
        // add duration
        scope.budget.sysValidityInterval +=
          '/' + scope.model.budgetValidDuration;
      }

      scope.budget.source = scope.selection.account.id;
      psBudgetService.collection.add(scope.budget).then(function(budget) {
        stackable.close(null, budget);
      }).catch(function(err) {
        brAlertService.add('error', err, {scope: scope});
        scope.$apply();
      });
    };
  }
}

return {psAddBudgetModal: factory};

});
