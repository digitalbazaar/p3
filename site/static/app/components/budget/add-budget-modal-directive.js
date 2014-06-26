/*!
 * Add Budget Modal.
 *
 * @author Dave Longley
 */
define([], function() {

var deps = [
  'AlertService', 'BudgetService', 'IdentityService', 'ModalService', 'config',
  'util'
];
return {addBudgetModal: deps.concat(factory)};

function factory(
  AlertService, BudgetService, IdentityService, ModalService, config, util) {
  return ModalService.directive({
    name: 'addBudget',
    templateUrl: '/app/components/budget/add-budget-modal.html',
    link: Link
  });

  function Link(scope) {
    scope.model = {};
    scope.selection = {
      account: null
    };
    scope.identity = IdentityService.identity;
    scope.state = BudgetService.state;
    scope.budget = {
      '@context': config.data.contextUrl,
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
      AlertService.clearModalFeedback(scope);

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
      BudgetService.collection.add(scope.budget).then(function(budget) {
        scope.modal.close(null, budget);
      }).catch(function(err) {
        AlertService.add('error', err);
        scope.$apply();
      });
    };
  }
}

});
