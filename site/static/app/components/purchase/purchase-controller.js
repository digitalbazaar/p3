/*!
 * Purchase Support
 *
 * @author David I. Lehn <dlehn@digitalbazaar.com>
 * @author Dave Longley
 * @author Manu Sporny
 */
define([], function() {

/* @ngInject */
function factory(
  $scope, $sce, AccountService, AddressService, AlertService,
  BudgetService, IdentityService, TransactionService, config) {
  var self = this;
  var data = config.data;
  self.identity = IdentityService.identity;
  self.budgets = BudgetService.budgets;
  self.accounts = AccountService.accounts;
  self.contract = null;
  self.callback = data.callback || null;
  if(self.callback) {
    self.callback = $sce.trustAsResourceUrl(self.callback);
  }
  self.listing = data.listing;
  self.listingHash = data.listingHash;
  self.referenceId = data.referenceId || null;
  self.nonce = data.nonce || null;
  self.referer = data.referer || null;
  if(data.allowDuplicatePurchases) {
    self.referenceId = String(+new Date());
  }
  self.loading = true;
  self.ready = false;
  self.purchased = false;
  self.duplicate = false;
  self.selection = {
    account: null,
    budget: null
  };
  // default to one-time purchase
  self.sourceType = 'account';
  self.source = null;
  self.alertType = null;
  self.purchaseDisabled = false;
  self.showDetails = false;

  // load and use default account if possible
  if(IdentityService.identity.preferences.source) {
    AccountService.collection.get(IdentityService.identity.preferences.source)
      .then(function(account) {
        self.selection.account = account;
      })
      .catch(function(err) {
        AlertService.add('error', err);
      })
      .then(function() {
        $scope.$apply();
      });
  }

  // watches
  $scope.$watch(function() {
    return self.selection.invalidAccount;
  }, updatePurchaseDisabled);
  $scope.$watch(function() {
    return self.selection.invalidBudget;
  }, updatePurchaseDisabled);
  $scope.$watch(function() {
    return self.selection.account;
  }, function(value) {
    if(self.sourceType === 'account') {
      if(self.source !== value) {
        self.source = self.selection.account.id;
        if(self.ready) {
          updateQuote(self.source);
        }
      }
    }
  });
  $scope.$watch(function() {
    return self.selection.budget;
  }, function(value) {
    if(self.sourceType === 'budget') {
      if(self.source !== value) {
        self.source = self.selection.budget.source;
        if(self.ready) {
          updateQuote(self.source);
        }
      }
    }
  });
  $scope.$watch(function() {
    return self.sourceType;
  }, function(value) {
    if(self.ready) {
      if(value === 'account' && self.selection.account &&
        self.source !== self.selection.account.id) {
        self.source = self.selection.account.id;
        updateQuote(self.source);
      } else if(value === 'budget' && self.selection.budget &&
        self.source !== self.selection.budget.source) {
        self.source = self.selection.budget.source;
        updateQuote(self.source);
      }
    }
    updatePurchaseDisabled();
  });

  // purchase clicked
  self.purchase = function() {
    if(self.sourceType === 'budget') {
      // do budget-based purchase
      // first add vendor to budget
      var budget = self.selection.budget;
      return BudgetService.addVendor(
        budget.id, self.contract.vendor.id).then(function() {
          return purchase(budget.source);
        });
    }
    // do account-based purchase
    return purchase(self.selection.account.id);
  };

  // retry purchase after modals are done
  self.addAddressModalDone = self.addAccountModalDone = function() {
    tryPurchase();
  };

  // main checks and calls to do purchase
  // may be re-entrant if modals were opened
  tryPurchase();

  function updatePurchaseDisabled() {
    self.purchaseDisabled = true;
    switch(self.sourceType) {
    case 'account':
      self.purchaseDisabled = self.selection.invalidAccount;
      break;
    case 'budget':
      self.purchaseDisabled = self.selection.invalidBudget;
      break;
    }
  }

  function tryPurchase() {
    // load data in parallel
    Promise.all([
      AddressService.getAll({force: true}),
      AccountService.collection.getAll({force: true})
    ]).then(function(results) {
      // check pre-conditions serially so only one modal is shown at a time
      var addresses = results[0];
      if(addresses.length === 0) {
        self.showAddAddressModal = true;
        throw {
          type: 'payswarm.identity.IdentityIncomplete',
          message: 'Address required to make a purchase.'
        };
      }
      var accounts = results[1];
      if(accounts.length === 0) {
        self.showAddAccountModal = true;
        throw {
          type: 'payswarm.identity.IdentityIncomplete',
          message: 'Account required to make a purchase.'
        };
      }

      // ensure budgets are up-to-date
      return BudgetService.collection.getAll({force: true});
    }).then(function() {
      // get a quote now; this can still fail if data is changed between the
      // checks and quote
      self.selection.account = (
        self.selection.account || self.accounts[0]);
      self.source = self.selection.account.id;
      return updateQuote(self.source).then(function() {
        // attempt to auto-purchase using a current budget
        autoPurchase();
      }).catch(function(){});
    }).then(function() {
      // page now ready
      self.ready = true;
      $scope.$apply();
    });
  }

  /**
   * Updates a quote based on the listing. The price may only change based on
   * identity, not on financial account. This means that the quote only needs
   * to be regenerated once the purchase is initiated and only if a different
   * account from the original quote was selected (either through the account
   * selector or the budget selector).
   *
   * @param source the source account or budget to use to generate the quote.
   *
   * @return a Promise.
   */
  function updateQuote(source) {
    self.loading = true;
    var request = {
      '@context': config.data.contextUrl,
      listing: self.listing,
      listingHash: self.listingHash,
      source: source
    };
    if(self.referenceId !== null) {
      request.referenceId = self.referenceId;
    }
    if(self.nonce !== null) {
      request.nonce = self.nonce;
    }
    return TransactionService.getQuote(request).then(function(contract) {
      self.loading = false;
      self.contract = contract;
      $scope.$apply();
    }).catch(function(err) {
      AlertService.add('error', err);
      self.loading = false;
      $scope.$apply();
      throw err;
    });
  }

  // do purchase
  function purchase(source) {
    var promise;
    // ensure account matches quote
    var src = self.contract ? self.contract.transfer[0].source : null;
    if(src !== source) {
      promise = updateQuote(source);
    } else {
      promise = Promise.resolve();
    }
    promise.then(function() {
      var request = {
        '@context': config.data.contextUrl,
        type: 'PurchaseRequest',
        transactionId: self.contract.id
      };
      if(self.nonce !== null) {
        request.nonce = self.nonce;
      }
      return TransactionService.purchase(request).then(function(response) {
        self.alertType = 'purchased';
        self.purchased = true;
        if(response.type === 'EncryptedMessage') {
          self.encryptedMessage = response;
        } else {
          self.receipt = response;
        }

        if(!self.budget) {
          return;
        }
        // auto-purchased, update budget
        return BudgetService.collection.get(self.budget.id, {force: true})
          .then(function(budget) {
            self.budget = budget;
          })
          .catch(function(err) {
            // log error but don't throw it, purchase was completed
            AlertService.add('error', err);
          });
      }).catch(function(err) {
        AlertService.add('error', err);
        // clear any auto-purchase budget
        self.budget = null;
        switch(err.type) {
        case 'payswarm.financial.BudgetExceeded':
          // can't do purchase
          // show alert markup and show budget's account
          self.alertType = 'budgetExceeded';
          self.sourceType = 'account';
          var budget = budgetForContract();
          self.selection.budget = budget;
          self.selection.account = null;
          var accountId = (budget ? budget.source : null);
          if(accountId) {
            AccountService.collection.get(accountId).then(function(account) {
              self.selection.account = account;
            }).catch(function(err) {
              AlertService.add('error', err);
            }).then(function() {
              $scope.$apply();
            });
          }
          break;
        case 'payswarm.website.DuplicatePurchase':
          // set duplicate contract
          self.alertType = 'duplicatePurchase';
          self.purchased = true;
          self.contract = err.details.contract;
          self.encryptedMessage = err.details.encryptedMessage;
          break;
        }
      }).then(function() {
        $scope.$apply();
      });
    });
  }

  // try to find budget for a contract
  function budgetForContract() {
    var budgets = self.budgets;
    var vendor = self.contract.vendor.id;
    for(var bi = 0; bi < budgets.length; ++bi) {
      var budget = budgets[bi];
      for(var vi = 0; vi < budget.vendor.length; ++vi) {
        if(budget.vendor[vi] === vendor) {
          // found budget for this vendor
          return budget;
        }
      }
    }
    return null;
  }

  // auto-purchase w/existing budget
  function autoPurchase() {
    // ensure referring webpage is from vendor's website
    var referer = self.referer;
    var website = self.contract.vendor.website;
    if(!referer || referer.indexOf(website) !== 0) {
      return;
    }

    // FIXME: should do another call to check for id+vendor budget instead?
    // FIXME: add "always confirm" option to budgets and/or to identity prefs
    // check budgets for this vendor, if it exists, auto submit purchase
    var budget = budgetForContract();
    if(budget) {
      // budget found, try auto-purchase
      self.budget = budget;
      return purchase(budget.source);
    }
  }
}

return {PurchaseController: factory};

});
