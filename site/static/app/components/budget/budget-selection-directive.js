/*!
 * Budget Selection Display.
 *
 * @author Digital Bazaar
 */
define([], function() {

'use strict';

/* @ngInject */
function factory(psAccountService) {
  return {
    restrict: 'E',
    scope: {
      budget: '=psBudget',
      select: '&?psSelect',
      invalid: '=psInvalid',
      minBalance: '@psMinBalance'
    },
    templateUrl: '/app/components/budget/budget-selection.html',
    link: Link
  };

  function Link(scope) {
    scope.account = null;
    scope.accounts = psAccountService.accounts;

    scope.$watch('budget', function(value) {
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

    scope.$watch('budget.account', function(value) {
      scope.invalid = false;
      scope.balanceTooLow = false;
      if(value && scope.minBalance !== undefined) {
        if(parseFloat(value.balance) < parseFloat(scope.minBalance)) {
          scope.invalid = true;
          scope.balanceTooLow = true;
        }
      }
    });

    scope.$watch('budget.sysMaxPerUse', function(value) {
      scope.invalid = false;
      scope.maxPerUseTooLow = false;
      if(value && scope.minBalance !== undefined) {
        if(parseFloat(value) < parseFloat(scope.minBalance)) {
          scope.invalid = true;
          scope.maxPerUseTooLow = true;
        }
      }
    });

    scope.$watch('budget.balance', function(value) {
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
  }
}

return {psBudgetSelection: factory};

});
