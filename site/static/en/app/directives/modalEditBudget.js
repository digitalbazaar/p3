/*!
 * Edit Budget Modal.
 *
 * @author Dave Longley
 */
define(['angular', 'payswarm.api'], function(angular, payswarm) {

var deps = ['svcModal'];
return {modalEditBudget: deps.concat(factory)};

function factory(svcModal) {
  function Ctrl($scope, svcBudget, svcAccount) {
    $scope.selection = {
      account: null
    };

    $scope.model = {};
    $scope.data = window.data || {};
    $scope.feedback = {};
    $scope.identity = $scope.data.identity || {};
    $scope.refreshChoices = [
      {label: 'Never', value: 'never'},
      {label: 'Hourly', value: 'PT1H'},
      {label: 'Daily', value: 'P1D'},
      {label: 'Weekly', value: 'P1W'},
      {label: 'Monthly', value: 'P1M'},
      {label: 'Yearly', value: 'P1Y'}
    ];
    $scope.validityChoices = [
      {label: 'Current', value: ''},
      {label: 'Never', value: 'never'},
      {label: '1 month', value: 'P1M'},
      {label: '3 months', value: 'P3M'},
      {label: '6 months', value: 'P6M'},
      {label: '1 year', value: 'P1Y'}
    ];
    // copy source budget for editing
    $scope.budget = {};
    angular.extend($scope.budget, $scope.sourceBudget);
    // default to current value
    $scope.model.budgetRefreshDuration = svcBudget.getRefreshDuration(
      $scope.budget);
    $scope.model.budgetValidDuration = '';
    svcAccount.getOne($scope.budget.source, function(err, account) {
      // FIXME: handle error
      $scope.selection.account = account || null;
      $scope.loading = false;
    });

    $scope.editBudget = function() {
      // set all fields from UI
      var b = $scope.budget;

      // budget refresh duration
      if($scope.model.budgetRefreshDuration ===
        svcBudget.getRefreshDuration($scope.sourceBudget)) {
        b.psaRefreshInterval = undefined;
      }
      else if($scope.model.budgetRefreshDuration === 'never') {
        b.psaRefreshInterval = window.iso8601.w3cDate();
      }
      else {
        b.psaRefreshInterval =
          'R/' + window.iso8601.w3cDate() + '/' +
          $scope.model.budgetRefreshDuration;
      }

      // budget valid duration
      if($scope.model.budgetValidDuration === '') {
        b.psaValidityInterval = undefined;
      }
      else {
        // set validity start date to now
        b.psaValidityInterval = window.iso8601.w3cDate();
        if($scope.model.budgetValidDuration !== 'never') {
          // add duration
          b.psaValidityInterval += '/' + $scope.model.budgetValidDuration;
        }
      }

      var budget = {
        '@context': payswarm.CONTEXT_URL,
        id: b.id,
        type: 'Budget',
        label: b.label,
        source: $scope.selection.account.id,
        amount: b.amount,
        // vendors not updated here
        //vendor: b.vendor,
        psaMaxPerUse: b.psaMaxPerUse,
        psaRefreshInterval: b.psaRefreshInterval,
        psaValidityInterval: b.psaValidityInterval
      };
      // remove fields not being updated
      angular.forEach(budget, function(value, key) {
        if(value === null || value === undefined || value.length === 0) {
          delete budget[key];
        }
      });

      $scope.loading = true;
      svcBudget.update(budget, function(err, budget) {
        $scope.loading = false;
        if(!err) {
          $scope.modal.close(null, budget);
        }
        $scope.feedback.error = err;
      });
    };
  }

  return svcModal.directive({
    name: 'EditBudget',
    scope: {sourceBudget: '=budget'},
    templateUrl: '/partials/modals/edit-budget.html',
    controller: Ctrl,
    link: function(scope, element, attrs) {
      scope.feedbackTarget = element;
    }
  });
}

});
