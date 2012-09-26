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

function BudgetCtrl($scope, $routeParams, svcBudget) {
  var data = window.data || {};
  $scope.session = data.session || null;
  $scope.identity = data.identity || null;

  $scope.state = svcBudget.state;

  $scope.deleteVendor = function(vendor) {
    svcBudget.delVendor(data.budgetId, vendor);
  };

  svcBudget.getOne(data.budgetId, function(err, budget) {
    $scope.budget = budget;
  });
};

})();
