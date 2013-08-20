/*!
 * Budget Selector.
 *
 * @author Dave Longley
 */
define([], function() {

var deps = [];
return {budgetSelector: deps.concat(factory)};

function factory() {
  function Ctrl($scope, svcBudget, svcAccount) {
    $scope.model = {};
    $scope.services = {
      account: svcAccount.state,
      budget: svcBudget.state
    };
    $scope.budgets = svcBudget.budgets;
    $scope.account = null;
    $scope.accounts = svcAccount.accounts;
    $scope.$watch('budgets', function(budgets) {
      if(!$scope.selected || $.inArray($scope.selected, budgets) === -1) {
        $scope.selected = budgets[0] || null;
      }
    }, true);
    svcBudget.get();
  }

  function Link(scope, element, attrs) {
    attrs.$observe('fixed', function(value) {
      scope.fixed = value;
    });

    scope.$watch('selected', function(value) {
      // set associated account
      scope.account = null;
      if(value) {
        for(var i = 0; i < scope.accounts.length; ++i) {
          var account = scope.accounts[i];
          if(value.source === account.id) {
            scope.account = account;
            break;
          }
        }
      }
    });

    scope.$watch('selected.account', function(value) {
      scope.invalid = false;
      scope.balanceTooLow = false;
      if(value && scope.minBalance !== undefined) {
        if(parseFloat(value.balance) < parseFloat(scope.minBalance)) {
          scope.invalid = true;
          scope.balanceTooLow = true;
        }
      }
    });

    scope.$watch('selected.psaMaxPerUse', function(value) {
      scope.invalid = false;
      scope.maxPerUseTooLow = false;
      if(value && scope.minBalance !== undefined) {
        if(parseFloat(value) < parseFloat(scope.minBalance)) {
          scope.invalid = true;
          scope.maxPerUseTooLow = true;
        }
      }
    });

    scope.$watch('selected.balance', function(value) {
      // validation
      scope.invalid = false;
      scope.balanceTooLow = false;
      if(value && scope.minBalance !== undefined) {
        if(parseFloat(value) < parseFloat(scope.minBalance)) {
          scope.invalid = true;
          scope.balanceTooLow = true;
        }
      }
    });

    scope.$watch('minBalance', function(value) {
      // validation
      scope.invalid = false;
      scope.balanceTooLow = false;
      scope.maxPerUseTooLow = false;
      if(scope.selected && value !== undefined) {
        var minBalance = parseFloat(value);
        if(parseFloat(scope.selected.balance) < minBalance) {
          scope.invalid = true;
          scope.balanceTooLow = true;
        }
        // check max per use
        else if(scope.selected.psaMaxPerUse < minBalance) {
          scope.invalid = true;
          scope.maxPerUseTooLow = true;
        }
        // check associated account balance is too low
        else if(scope.account &&
          parseFloat(scope.account.balance) < minBalance) {
          scope.invalid = true;
          scope.balanceTooLow = true;
        }
      }
    });
  }

  return {
    scope: {
      selected: '=',
      invalid: '=',
      minBalance: '@',
      fixed: '@'
    },
    controller: Ctrl,
    templateUrl: '/partials/budget-selector.html',
    link: Link
  };
}

});
