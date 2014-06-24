/*!
 * Budget Controller.
 *
 * @author David I. Lehn
 * @author Dave Longley
 */
define([], function() {

var deps = ['$timeout', 'svcAccount', 'svcBudget', 'config'];
return {BudgetController: deps.concat(factory)};

function factory($timeout, svcAccount, svcBudget, config) {
  var self = this;

  self.state = svcBudget.state;
  self.budget = null;
  self.account = null;
  self.vendors = svcBudget.vendors;

  self.getLastRefresh = svcBudget.getLastRefresh;
  self.getRefreshDuration = svcBudget.getRefreshDuration;
  self.getExpiration = svcBudget.getExpiration;

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
        svcBudget.delVendor(config.data.budgetId, vendor.id, function(err) {
          if(err) {
            vendor.deleted = false;
          }
        });
      });
    }
  };

  svcBudget.get(config.data.budgetId).then(function(budget) {
    self.budget = budget;

    // fetch vendors for budget
    svcBudget.getVendors(budget.id);

    // get budget account
    svcAccount.get(budget.source).then(function(account) {
      self.account = account;
    });
  });
}

});
