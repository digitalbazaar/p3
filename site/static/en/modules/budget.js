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

function BudgetCtrl($scope, $routeParams, $timeout, svcAccount, svcBudget) {
  $scope.model = {};
  var data = window.data || {};

  $scope.state = svcBudget.state;
  $scope.budget = null;
  $scope.account = null;
  $scope.vendors = svcBudget.vendors;

  $scope.getLastRefresh = svcBudget.getLastRefresh;
  $scope.getRefreshDuration = svcBudget.getRefreshDuration;
  $scope.getExpiration = svcBudget.getExpiration;

  $scope.deleteVendor = function(vendor) {
    $scope.showDeleteVendorAlert = true;
    $scope.vendorToDelete = vendor;
  };
  $scope.confirmDeleteVendor = function(err, result) {
    // FIXME: handle errors
    if(!err && result === 'ok') {
      var vendor = $scope.vendorToDelete;
      vendor.deleted = true;

      // wait to delete so modal can transition
      $timeout(function() {
        svcBudget.delVendor(data.budgetId, vendor.id, function(err) {
          if(err) {
            vendor.deleted = false;
          }
        });
      });
    }
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
}

})();
