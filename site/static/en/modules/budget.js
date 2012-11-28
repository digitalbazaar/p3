/*!
 * Budget Details
 *
 * @author David I. Lehn
 * @author Dave Longley
 */
// FIXME: use RequireJS AMD format
(function() {

var module = angular.module('payswarm');

module.controller('BudgetCtrl', BudgetCtrl);

function BudgetCtrl($scope, $routeParams, svcAccount, svcBudget) {
  $scope.model = {};
  var data = window.data || {};

  $scope.state = svcBudget.state;
  $scope.budget = null;
  $scope.account = null;
  $scope.vendors = svcBudget.vendors;

  $scope.deleteVendor = function(vendor) {
    svcBudget.delVendor(data.budgetId, vendor.id, function(err) {
      if(err) {
        vendor.deleted = false;
      }
    });
  };

  svcBudget.getOne(data.budgetId, function(err, budget) {
    if(!err) {
      $scope.budget = budget;

      // fetch vendors for budget
      svcBudget.getVendors(budget.id);

      // get budget account
      svcAccount.getOne(budget.source, function(err, account) {
        if(!err) {
          $scope.account = account;
        }
      });
    }
  });
};

})();
