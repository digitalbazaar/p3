/*!
 * Budget Controller.
 *
 * @author David I. Lehn
 * @author Dave Longley
 */
define([], function() {

'use strict';

/* @ngInject */
function factory(
  $scope, $timeout, AccountService, brAlertService, BudgetService,
  brRefreshService) {
  var self = this;

  self.modals = {};
  self.state = {
    accounts: AccountService.state,
    budgets: BudgetService.state
  };
  self.budget = undefined;
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
        BudgetService.delVendor(self.budget.id, vendor.id).catch(function(err) {
          brAlertService.add('error', err);
          vendor.deleted = false;
          $scope.$apply();
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

  brRefreshService.register($scope, function(force) {
    var opts = {force: !!force};
    brAlertService.clear();
    BudgetService.collection.getCurrent(opts)
      .then(function(budget) {
        self.budget = budget;
        $scope.$apply();
      })
      .catch(function(err) {
        brAlertService.add('error', err);
        self.budget = null;
        $scope.$apply();
      });
  })();
}

return {BudgetController: factory};

});
