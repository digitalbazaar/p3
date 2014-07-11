/*!
 * Budget Selector.
 *
 * @author Dave Longley
 */
define([], function() {

/* @ngInject */
function factory(AccountService, BudgetService) {
  return {
    scope: {
      selected: '=',
      invalid: '=',
      minBalance: '@',
      fixed: '@'
    },
    templateUrl: '/app/components/budget/budget-selector.html',
    link: Link
  };

  function Link(scope, element, attrs) {
    scope.model = {};
    scope.services = {
      account: AccountService.state,
      budget: BudgetService.state
    };
    scope.budgets = BudgetService.budgets;
    scope.account = null;
    scope.accounts = AccountService.accounts;
    scope.$watch('budgets', function(budgets) {
      if(!scope.selected || $.inArray(scope.selected, budgets) === -1) {
        scope.selected = budgets[0] || null;
      }
    }, true);

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

    scope.$watch('selected.sysMaxPerUse', function(value) {
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
        } else if(scope.selected.sysMaxPerUse < minBalance) {
          // max per use too low
          scope.invalid = true;
          scope.maxPerUseTooLow = true;
        } else if(scope.account &&
          parseFloat(scope.account.balance) < minBalance) {
          // associated account balance is too low
          scope.invalid = true;
          scope.balanceTooLow = true;
        }
      }
    });

    BudgetService.collection.getAll();
  }
}

return {budgetSelector: factory};

});
