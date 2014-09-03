/*!
 * Budget Selector.
 *
 * @author Dave Longley
 */
define([], function() {

'use strict';

/* @ngInject */
function budgetSelectorInner(psBudgetService) {
  return {
    restrict: 'A',
    require: 'brSelector',
    link: Link
  };

  function Link(scope, element, attrs, brSelector) {
    var model = scope.model = {};
    model.state = psBudgetService.state;
    model.budgets = psBudgetService.budgets;
    scope.$watch('model.budgets', function(budgets) {
      if(!scope.selected || $.inArray(scope.selected, budgets) === -1) {
        scope.selected = budgets[0] || null;
      }
    }, true);

    // configure brSelector
    scope.brSelector = brSelector;
    brSelector.itemType = 'Budget';
    brSelector.items = model.budgets;
    brSelector.addItem = function() {
      model.showAddBudgetModal = true;
    };
    scope.$watch('fixed', function(value) {
      brSelector.fixed = value;
    });

    psBudgetService.collection.getAll();
  }
}

/* @ngInject */
function budgetSelector() {
  return {
    restrict: 'EA',
    scope: {
      selected: '=psSelected',
      invalid: '=psInvalid',
      fixed: '=?psFixed',
      minBalance: '@psMinBalance'
    },
    templateUrl: '/app/components/budget/budget-selector.html'
  };
}

return {
  psBudgetSelector: budgetSelector,
  psBudgetSelectorInner: budgetSelectorInner
};

});
