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

var deps = ['AlertService', 'BudgetService', 'IdentityService'];
return {budgets: deps.concat(factory)};

function factory(AlertService, BudgetService, IdentityService) {
  function Ctrl($scope) {
    var model = $scope.model = {};
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

        // wait to delete so modal can transition
        BudgetService.del(budget.id, {delay: 400}).catch(function(err) {
          AlertService.add('error', err);
          budget.deleted = false;
        });
      }
      model.budgetToDelete = null;
    };

    BudgetService.collection.getAll();
  }

  return {
    scope: {},
    controller: ['$scope', Ctrl],
    templateUrl: '/app/components/budget/budgets-view.html'
  };
}

});
