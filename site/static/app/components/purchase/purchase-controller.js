/*!
 * Purchase Support
 *
 * @author David I. Lehn <dlehn@digitalbazaar.com>
 * @author Dave Longley
 * @author Manu Sporny
 */
define([], function() {

var deps = [
  '$scope', '$sce', 'AccountService', 'AddressService', 'AlertService',
  'BudgetService', 'IdentityService', 'TransactionService', 'config'];
return {PurchaseCtrl: deps.concat(factory)};

function factory(
  $scope, $sce, AccountService, AddressService, AlertService,
  BudgetService, IdentityService, TransactionService, config) {
  $scope.model = {};
  var data = config.data;
  $scope.identity = IdentityService.identity;
  $scope.budgets = BudgetService.budgets;
  $scope.accounts = AccountService.accounts;
  $scope.contract = null;
  $scope.callback = data.callback || null;
  if($scope.callback) {
    $scope.callback = $sce.trustAsResourceUrl($scope.callback);
  }
  $scope.listing = data.listing;
  $scope.listingHash = data.listingHash;
  $scope.referenceId = data.referenceId || null;
  $scope.nonce = data.nonce || null;
  $scope.referer = data.referer || null;
  if(data.allowDuplicatePurchases) {
    $scope.referenceId = String(+new Date());
  }
  $scope.loading = true;
  $scope.ready = false;
  $scope.purchased = false;
  $scope.duplicate = false;
  $scope.selection = {
    account: null,
    budget: null
  };
  // default to one-time purchase
  $scope.sourceType = 'account';
  $scope.source = null;
  $scope.alertType = null;
  $scope.purchaseDisabled = false;

  // load and use default account if possible
  if(IdentityService.identity.preferences.source) {
    AccountService.get(IdentityService.identity.preferences.source)
      .then(function(account) {
        $scope.selection.account = account;
      })
      .catch(function(err) {
        AlertService.add('error', err);
      })
      .then(function() {
        $scope.$apply();
      });
  }

  // watches
  $scope.$watch('selection.invalidAccount', updatePurchaseDisabled);
  $scope.$watch('selection.invalidBudget', updatePurchaseDisabled);
  $scope.$watch('selection.account', function(value) {
    if($scope.sourceType === 'account') {
      if($scope.source !== value) {
        $scope.source = $scope.selection.account.id;
        if($scope.ready) {
          updateQuote($scope.source);
        }
      }
    }
  });
  $scope.$watch('selection.budget', function(value) {
    if($scope.sourceType === 'budget') {
      if($scope.source !== value) {
        $scope.source = $scope.selection.budget.source;
        if($scope.ready) {
          updateQuote($scope.source);
        }
      }
    }
  });
  $scope.$watch('sourceType', function(value) {
    if($scope.ready) {
      if(value === 'account' && $scope.selection.account &&
        $scope.source !== $scope.selection.account.id) {
        $scope.source = $scope.selection.account.id;
        updateQuote($scope.source);
      } else if(value === 'budget' && $scope.selection.budget &&
        $scope.source !== $scope.selection.budget.source) {
        $scope.source = $scope.selection.budget.source;
        updateQuote($scope.source);
      }
    }
    updatePurchaseDisabled();
  });

  // purchase clicked
  $scope.purchase = function() {
    if($scope.sourceType === 'budget') {
      // do budget-based purchase
      // first add vendor to budget
      var budget = $scope.selection.budget;
      return BudgetService.addVendor(
        budget.id, $scope.contract.vendor.id).then(function() {
          return purchase(budget.source);
        });
    }
    // do account-based purchase
    return purchase($scope.selection.account.id);
  };

  // retry purchase after modals are done
  $scope.addAddressModalDone = $scope.addAccountModalDone = function() {
    tryPurchase();
  };

  // main checks and calls to do purchase
  // may be re-entrant if modals were opened
  tryPurchase();

  function updatePurchaseDisabled() {
    $scope.purchaseDisabled = true;
    switch($scope.sourceType) {
    case 'account':
      $scope.purchaseDisabled = $scope.selection.invalidAccount;
      break;
    case 'budget':
      $scope.purchaseDisabled = $scope.selection.invalidBudget;
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
        $scope.showAddAddressModal = true;
        throw {
          type: 'payswarm.identity.IdentityIncomplete',
          message: 'Address required to make a purchase.'
        };
      }
      var accounts = results[1];
      if(accounts.length === 0) {
        $scope.showAddAccountModal = true;
        throw {
          type: 'payswarm.identity.IdentityIncomplete',
          message: 'Account required to make a purchase.'
        };
      }

      // ensure budgets are up-to-date
      return BudgetService.getAll({force: true});
    }).then(function() {
      // get a quote now; this can still fail if data is changed between the
      // checks and quote
      $scope.selection.account = (
        $scope.selection.account || $scope.accounts[0]);
      $scope.source = $scope.selection.account.id;
      return updateQuote($scope.source);
    }).then(function() {
      // attempt to auto-purchase using a current budget
      autoPurchase();
    }).then(function() {
      // page now ready
      $scope.ready = true;
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
    $scope.loading = true;
    var request = {
      '@context': config.data.contextUrl,
      listing: $scope.listing,
      listingHash: $scope.listingHash,
      source: source
    };
    if($scope.referenceId !== null) {
      request.referenceId = $scope.referenceId;
    }
    if($scope.nonce !== null) {
      request.nonce = $scope.nonce;
    }
    return TransactionService.getQuote(request).then(function(contract) {
      $scope.loading = false;
      $scope.contract = contract;
      $scope.$apply();
    }).catch(function(err) {
      AlertService.add('error', err);
      $scope.loading = false;
      $scope.$apply();
      throw err;
    });
  }

  // do purchase
  function purchase(source) {
    var promise;
    // ensure account matches quote
    var src = $scope.contract.transfer[0].source;
    if(src !== source) {
      promise = updateQuote(source);
    } else {
      promise = Promise.resolve();
    }
    promise.then(function() {
      var request = {
        '@context': config.data.contextUrl,
        type: 'PurchaseRequest',
        transactionId: $scope.contract.id
      };
      if($scope.nonce !== null) {
        request.nonce = $scope.nonce;
      }
      return TransactionService.purchase(request).then(function(response) {
        $scope.alertType = 'purchased';
        $scope.purchased = true;
        if(response.type === 'EncryptedMessage') {
          $scope.encryptedMessage = response;
        } else {
          $scope.receipt = response;
        }

        if(!$scope.budget) {
          return;
        }
        // auto-purchased, update budget
        return BudgetService.get($scope.budget.id, {force: true})
          .then(function(budget) {
            $scope.budget = budget;
          })
          .catch(function(err) {
            // log error but don't throw it, purchase was completed
            AlertService.add('error', err);
          });
      }).catch(function(err) {
        AlertService.add('error', err);
        // clear any auto-purchase budget
        $scope.budget = null;
        switch(err.type) {
        case 'payswarm.financial.BudgetExceeded':
          // can't do purchase
          // show alert markup and show budget's account
          $scope.alertType = 'budgetExceeded';
          $scope.sourceType = 'account';
          var budget = budgetForContract();
          $scope.selection.budget = budget;
          $scope.selection.account = null;
          var accountId = (budget ? budget.source : null);
          if(accountId) {
            AccountService.get(accountId).then(function(account) {
              $scope.selection.account = account;
            }).catch(function(err) {
              AlertService.add('error', err);
            }).then(function() {
              $scope.$apply();
            });
          }
          break;
        case 'payswarm.website.DuplicatePurchase':
          // set duplicate contract
          $scope.alertType = 'duplicatePurchase';
          $scope.purchased = true;
          $scope.contract = err.details.contract;
          $scope.encryptedMessage = err.details.encryptedMessage;
          break;
        }
      }).then(function() {
        $scope.$apply();
      });
    });
  }

  // try to find budget for a contract
  function budgetForContract() {
    var budgets = $scope.budgets;
    var vendor = $scope.contract.vendor.id;
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
    var referer = $scope.referer;
    var website = $scope.contract.vendor.website;
    if(!referer || referer.indexOf(website) !== 0) {
      return;
    }

    // FIXME: should do another call to check for id+vendor budget instead?
    // FIXME: add "always confirm" option to budgets and/or to identity prefs
    // check budgets for this vendor, if it exists, auto submit purchase
    var budget = budgetForContract();
    if(budget) {
      // budget found, try auto-purchase
      $scope.budget = budget;
      return purchase(budget.source);
    }
  }
}

});
