/*!
 * Budget Bar directive.
 *
 * @author Dave Longley
 */
define([], function() {

'use strict';

/* @ngInject */
function factory() {
  return {
    restrict: 'A',
    scope: {budget: '=psBudgetBar'},
    replace: true,
    templateUrl: '/app/components/budget/budget-bar.html',
    link: function(scope) {
      var model = scope.model = {};
      model.barPercentage = 0;
      model.textPercentage = 0;

      // update progress bar when balance or amount changes
      scope.$watch('budget', function(budget) {
        var model = scope.model;
        var balance = budget ? budget.balance : '0';
        var amount = budget ? budget.amount : '0';
        model.barPercentage = parseFloat(balance) / parseFloat(amount) * 100;
        model.barPercentage = Math.max(0, Math.min(model.barPercentage, 100));
        model.textPercentage = 100 / model.barPercentage * 100;
      }, true);
    }
  };
}

return {psBudgetBar: factory};

});
