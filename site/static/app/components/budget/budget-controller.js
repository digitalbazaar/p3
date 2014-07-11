/*!
 * Budget Controller.
 *
 * @author David I. Lehn
 * @author Dave Longley
 */
define([], function() {

var deps = [
  '$scope', '$timeout', 'AccountService', 'AlertService', 'BudgetService',
  'RefreshService', 'config'
];
return {BudgetController: deps.concat(factory)};

function factory(
  $scope, $timeout, AccountService, AlertService, BudgetService,
  RefreshService, config) {
  var self = this;

  self.state = BudgetService.state;
  self.budget = null;
  self.account = null;
  self.vendors = BudgetService.vendors;

  self.getLastRefresh = BudgetService.getLastRefresh;
  self.getRefreshDuration = BudgetService.getRefreshDuration;
  self.getExpiration = BudgetService.getExpiration;

  self.deleteVendor = function(vendor) {
    self.showDeleteVendorAlert = true;
    self.vendorToDelete = vendor;
  };
  self.confirmDeleteVendor = function(err, result) {
    // FIXME: handle errors
    if(!err && result === 'ok') {
      var vendor = self.vendorToDelete;
      vendor.deleted = true;

      // wait to delete so modal can transition
      $timeout(function() {
        BudgetService.delVendor(config.data.budgetId, vendor.id, function(err) {
          if(err) {
            vendor.deleted = false;
          }
        });
      });
    }
  };

  $scope.$watch(function() { return self.budget; }, function(budget) {
    if(!budget) {
      return;
    }

    // fetch vendors for budget
    var vendorsPromise = BudgetService.getVendors(budget.id);

    // get budget account
    var accountPromise = AccountService.collection.get(budget.source)
      .then(function(account) {
        self.account = account;
      });

    Promise.all([vendorsPromise, accountPromise]).then(function() {
      $scope.$apply();
    });
  });

  RefreshService.register($scope, function(force) {
    var opts = {force: !!force};
    AlertService.clear();
    BudgetService.collection.getCurrent(opts)
      .then(function(budget) {
        self.budget = budget;
        $scope.$apply();
      })
      .catch(function(err) {
        AlertService.add('error', err);
        $scope.$apply();
      });
  })();
}

});
