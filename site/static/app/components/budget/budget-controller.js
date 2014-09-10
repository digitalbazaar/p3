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
  $scope, $timeout, brAlertService, brRefreshService,
  psAccountService, psBudgetService) {
  var self = this;

  self.modals = {};
  self.state = {
    accounts: psAccountService.state,
    budgets: psBudgetService.state
  };
  self.budget = undefined;
  self.account = null;
  self.vendors = psBudgetService.vendors;

  self.getLastRefresh = psBudgetService.getLastRefresh;
  self.getRefreshDuration = psBudgetService.getRefreshDuration;
  self.getExpiration = psBudgetService.getExpiration;

  self.deleteVendor = function(vendor) {
    self.modals.showDeleteVendorAlert = true;
    self.modals.vendorToDelete = vendor;
  };
  self.confirmDeleteVendor = function(err, result) {
    // FIXME: handle errors
    if(!err && result === 'ok') {
      var vendor = self.modals.vendorToDelete;
      vendor.deleted = true;

      // wait to delete so modal can transition
      $timeout(function() {
        psBudgetService.delVendor(self.budget.id, vendor.id)
          .catch(function(err) {
            brAlertService.add('error', err);
            vendor.deleted = false;
          }).then(function() {
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
    var vendorsPromise = psBudgetService.getVendors(budget.id);

    // get budget account
    var accountPromise = psAccountService.collection.get(budget.source)
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
    psBudgetService.collection.getCurrent(opts)
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
