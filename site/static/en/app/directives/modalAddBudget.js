/*!
 * Add Budget Modal.
 *
 * @author Dave Longley
 */
define(['payswarm.api'], function(payswarm) {

var deps = ['svcModal'];
return {modalAddBudget: deps.concat(factory)};

function factory(svcModal) {
  function Ctrl($scope, svcBudget) {
    $scope.selection = {
      account: null
    };

    $scope.model = {};
    $scope.data = window.data || {};
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
      // budget refresh duration
      if($scope.model.budgetRefreshDuration !== 'never') {
        $scope.budget.psaRefreshInterval =
          'R/' + window.iso8601.w3cDate() + '/' +
          $scope.model.budgetRefreshDuration;
      }

      // set budget validity start date to now
      $scope.budget.psaValidityInterval = window.iso8601.w3cDate();
      if($scope.model.budgetValidDuration !== 'never') {
        // add duration
        $scope.budget.psaValidityInterval +=
          '/' + $scope.model.budgetValidDuration;
      }

      $scope.budget.source = $scope.selection.account.id;
      $scope.loading = true;
      svcBudget.add($scope.budget, function(err, budget) {
        $scope.loading = false;
        if(!err) {
          $scope.modal.close(null, budget);
        }
        $scope.feedback.error = err;
      });
    };
  }

  return svcModal.directive({
    name: 'AddBudget',
    templateUrl: '/partials/modals/add-budget.html',
    controller: Ctrl,
    link: function(scope, element, attrs) {
      scope.feedbackTarget = element;
    }
  });
}

});
