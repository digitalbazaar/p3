/*!
 * Budget Controller.
 *
 * @author David I. Lehn
 * @author Dave Longley
 */
define([], function() {

var deps = ['$timeout', 'AccountService', 'BudgetService', 'config'];
return {BudgetController: deps.concat(factory)};

function factory($timeout, AccountService, BudgetService, config) {
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

  BudgetService.get(config.data.budgetId).then(function(budget) {
    self.budget = budget;

    // fetch vendors for budget
    BudgetService.getVendors(budget.id);

    // get budget account
    AccountService.get(budget.source).then(function(account) {
      self.account = account;
    });
  });
}

});
