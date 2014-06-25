/*!
 * Add Budget Modal.
 *
 * @author Dave Longley
 */
define(['payswarm.api'], function(payswarm) {

var deps = ['AlertService', 'BudgetService', 'ModalService', 'config'];
return {addBudgetModal: deps.concat(factory)};

function factory(AlertService, BudgetService, ModalService, config) {
  function Ctrl($scope) {
    $scope.selection = {
      account: null
    };

    $scope.model = {};
    $scope.data = config.data || {};
    $scope.feedback = {};
    $scope.loading = false;
    $scope.identity = $scope.data.identity || {};
    $scope.budget = {
      '@context': payswarm.CONTEXT_URL,
      type: 'Budget'
    };
    $scope.refreshChoices = [
      {label: 'Never', value: 'never'},
      {label: 'Hourly', value: 'PT1H'},
      {label: 'Daily', value: 'P1D'},
      {label: 'Weekly', value: 'P1W'},
      {label: 'Monthly', value: 'P1M'},
      {label: 'Yearly', value: 'P1Y'}
    ];
    $scope.validityChoices = [
      {label: 'Never', value: 'never'},
      {label: '1 month', value: 'P1M'},
      {label: '3 months', value: 'P3M'},
      {label: '6 months', value: 'P6M'},
      {label: '1 year', value: 'P1Y'}
    ];
    $scope.model.budgetRefreshDuration = 'never';
    $scope.model.budgetValidDuration = 'never';

    $scope.addBudget = function() {
      AlertService.clearModalFeedback($scope);

      // budget refresh duration
      if($scope.model.budgetRefreshDuration !== 'never') {
        $scope.budget.sysRefreshInterval =
          'R/' + window.iso8601.w3cDate() + '/' +
          $scope.model.budgetRefreshDuration;
      }

      // set budget validity start date to now
      $scope.budget.sysValidityInterval = window.iso8601.w3cDate();
      if($scope.model.budgetValidDuration !== 'never') {
        // add duration
        $scope.budget.sysValidityInterval +=
          '/' + $scope.model.budgetValidDuration;
      }

      $scope.budget.source = $scope.selection.account.id;
      $scope.loading = true;
      BudgetService.add($scope.budget).then(function(budget) {
        $scope.loading = false;
        $scope.modal.close(null, budget);
      }).catch(function(err) {
        AlertService.add('error', err);
      });
    };
  }

  return ModalService.directive({
    name: 'addBudget',
    templateUrl: '/app/components/budget/add-budget-modal.html',
    controller: ['$scope', Ctrl],
    link: function(scope, element, attrs) {
      scope.feedbackTarget = element;
    }
  });
}

});
