/*!
 * Edit Budget Modal.
 *
 * @author Dave Longley
 */
define(['angular'], function(angular) {

var deps = [
  'AccountService', 'AlertService', 'BudgetService', 'ModalService', 'config'];
return {editBudgetModal: deps.concat(factory)};

function factory(
  AccountService, AlertService, BudgetService, ModalService, config) {
  function Ctrl($scope) {
    $scope.selection = {
      account: null
    };

    $scope.model = {};
    $scope.data = config.data || {};
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
    $scope.model.budgetRefreshDuration = BudgetService.getRefreshDuration(
      $scope.budget);
    $scope.model.budgetValidDuration = '';
    AccountService.get($scope.budget.source).then(function(account) {
      $scope.selection.account = account;
      $scope.loading = false;
      $scope.$apply();
    }).catch(function(err) {
      $scope.loading = false;
      AlertService.addError('error', err);
    });

    $scope.editBudget = function() {
      AlertService.clearModalFeedback($scope);

      // set all fields from UI
      var b = $scope.budget;

      // budget refresh duration
      if($scope.model.budgetRefreshDuration ===
        BudgetService.getRefreshDuration($scope.sourceBudget)) {
        b.sysRefreshInterval = undefined;
      } else if($scope.model.budgetRefreshDuration === 'never') {
        b.sysRefreshInterval = window.iso8601.w3cDate();
      } else {
        b.sysRefreshInterval =
          'R/' + window.iso8601.w3cDate() + '/' +
          $scope.model.budgetRefreshDuration;
      }

      // budget valid duration
      if($scope.model.budgetValidDuration === '') {
        b.sysValidityInterval = undefined;
      } else {
        // set validity start date to now
        b.sysValidityInterval = window.iso8601.w3cDate();
        if($scope.model.budgetValidDuration !== 'never') {
          // add duration
          b.sysValidityInterval += '/' + $scope.model.budgetValidDuration;
        }
      }

      var budget = {
        '@context': config.data.contextUrl,
        id: b.id,
        type: 'Budget',
        label: b.label,
        source: $scope.selection.account.id,
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

      $scope.loading = true;
      BudgetService.update(budget).then(function(budget) {
        $scope.loading = false;
        $scope.modal.close(null, budget);
      }).catch(function(err) {
        $scope.loading = false;
        AlertService.add('error', err);
      });
    };
  }

  return ModalService.directive({
    name: 'editBudget',
    scope: {sourceBudget: '=budget'},
    templateUrl: '/app/components/budget/edit-budget-modal.html',
    controller: ['$scope', Ctrl],
    link: function(scope, element, attrs) {
      scope.feedbackTarget = element;
    }
  });
}

});
