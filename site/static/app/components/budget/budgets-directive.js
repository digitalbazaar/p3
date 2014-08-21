/*!
 * Budgets directive.
 *
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 * @author David I. Lehn
 */
define([], function() {

'use strict';

/* @ngInject */
function factory(AlertService, BudgetService) {
  return {
    restrict: 'A',
    scope: {},
    templateUrl: '/app/components/budget/budgets-view.html',
    link: Link
  };

  function Link(scope) {
    var model = scope.model = {};
    model.budgets = BudgetService.budgets;
    model.state = {
      budgets: BudgetService.state
    };
    model.modals = {
      showEditBudget: false,
      showAddBudget: false,
      budget: null
    };
    model.getBudgetRefreshDuration = BudgetService.getRefreshDuration;
    model.deleteBudget = function(budget) {
      model.showDeleteBudgetAlert = true;
      model.budgetToDelete = budget;
    };
    model.confirmDeleteBudget = function(err, result) {
      // FIXME: handle errors
      if(!err && result === 'ok') {
        var budget = model.budgetToDelete;
        budget.deleted = true;
        scope.$apply();
        // wait to delete so modal can transition
        BudgetService.collection.del(budget.id, {delay: 400})
          .catch(function(err) {
            AlertService.add('error', err);
            budget.deleted = false;
            scope.$apply();
          });
      }
      model.budgetToDelete = null;
    };

    BudgetService.collection.getAll();
  }
}

return {budgets: factory};

});
