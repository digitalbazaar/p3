/*!
 * Purchase Support
 *
 * @author David I. Lehn <dlehn@digitalbazaar.com>
 * @author Dave Longley
 * @author Manu Sporny
 */
(function() {

var module = angular.module('payswarm');

module.controller('PurchaseCtrl', function(
  $scope, svcAccount, svcBudget, svcAddress, svcIdentity) {
  $scope.model = {};
  var data = window.data;
  $scope.identity = svcIdentity.identity;
  $scope.budgets = svcBudget.budgets;
  $scope.accounts = svcAccount.accounts;
  $scope.contract = null;
  $scope.callback = data.callback || null;
  $scope.listing = data.listing;
  $scope.listingHash = data.listingHash;
  $scope.referenceId = data.referenceId || null;
  $scope.nonce = data.nonce || null;
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

  $scope.$watch('selection.invalidAccount', function(value) {
    $scope.purchaseDisabled = !!value;
  });
  $scope.$watch('selection.invalidBudget', function(value) {
    $scope.purchaseDisabled = !!value;
  });
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
      }
      else if(value === 'budget' && $scope.selection.budget &&
        $scope.source !== $scope.selection.budget.source) {
        $scope.source = $scope.selection.budget.source;
        updateQuote($scope.source);
      }
    }
  });

  // purchase clicked
  $scope.purchase = function() {
    // do budget-based purchase
    if($scope.sourceType === 'budget') {
      // first add vendor to budget
      var budget = $scope.selection.budget;
      return payswarm.budgets.addVendor({
        budget: budget.id,
        vendor: $scope.contract.assetProvider.id,
        success: function() {
          // do budget-based purchase
          purchase(budget.source, purchaseCallback);
        },
        error: function(err) {
          $scope.error = err;
          $scope.$apply();
        }
      });
    }

    // do account-based purchase
    purchase($scope.selection.account.id, purchaseCallback);
  };

  // retry purchase after modals are done
  $scope.addAddressModalDone = $scope.addAccountModalDone = function() {
    tryPurchase();
  };

  // main checks and calls to do purchase
  // may be re-entrant if modals were opened
  tryPurchase();
  function tryPurchase() {
    async.auto({
      // load data in parallel
      getAddresses: function(callback) {
        svcAddress.get({force: true}, callback);
      },
      getAccounts: function(callback) {
        svcAccount.get({force: true}, callback);
      },
      // check pre-conditions serially so only one modal is shown at a time
      checkAddresses: ['getAddresses',
        function(callback, results) {
        if(results.getAddresses.length === 0) {
          $scope.showAddAddressModal = true;
          callback({
            type: 'payswarm.identity.IdentityIncomplete',
            message: 'Address required to make a purchase.'
          });
          return;
        }
        callback();
      }],
      checkAccounts: ['getAccounts', 'checkAddresses',
        function(callback, results) {
        if(results.getAccounts.length === 0) {
          $scope.showAddAccountModal = true;
          callback({
            type: 'payswarm.identity.IdentityIncomplete',
            message: 'Account required to make a purchase.'
          });
          return;
        }
        callback();
      }],
      // identity is setup at this point, continue and get a quote
      // this can still fail if data is changed between the checks and quote
      getBudgets: ['checkAddresses', 'checkAccounts', function(callback) {
        svcBudget.get({force: true}, callback);
      }],
      getQuote: ['getBudgets',
        function(callback) {
        $scope.selection.account =
          $scope.selection.account || $scope.accounts[0];
        $scope.source = $scope.selection.account.id;
        updateQuote($scope.source, callback);
      }],
      main: ['getQuote', function(callback) {
        // attempt to auto-purchase using a current budget
        autoPurchase(callback);
      }]
    }, function(err, results) {
      // page now ready
      $scope.ready = true;

      // handle errors and successes
      purchaseCallback(err, results ? results.main : null);
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
   * @param callback(err) called once the operation completes.
   */
  function updateQuote(source, callback) {
    callback = callback || angular.noop;
    $scope.loading = true;
    payswarm.transactions.getQuote({
      purchaseRequest: (function() {
        var rval = {
          '@context': 'http://purl.org/payswarm/v1',
          listing: $scope.listing,
          listingHash: $scope.listingHash,
          source: source
        };
        if($scope.referenceId !== null) {
          rval.referenceId = $scope.referenceId;
        }
        if($scope.nonce !== null) {
          rval.nonce = $scope.nonce;
        }
        return rval;
      })(),
      success: function(contract) {
        $scope.contract = contract;
        $scope.loading = false;
        $scope.$apply();
        callback();
      },
      error: function(err) {
        $scope.loading = false;
        $scope.$apply();
        callback(err);
      }
    });
  }

  // do purchase
  function purchase(source, callback) {
    callback = callback || angular.noop;
    async.waterfall([
      function checkQuote(callback) {
        // ensure account matches quote
        var src = $scope.contract.transfer[0].source;
        if(src !== source) {
          return updateQuote(source, callback);
        }
        callback();
      },
      function(callback) {
        payswarm.transactions.purchase({
          purchaseRequest: (function() {
            var rval = {
              '@context': 'http://purl.org/payswarm/v1',
              type: 'ps:PurchaseRequest',
              transactionId: $scope.contract.id
            };
            if($scope.nonce !== null) {
              rval.nonce = $scope.nonce;
            }
            return rval;
          })(),
          success: function(encryptedMessage) {
            $scope.alertType = 'purchased';
            $scope.purchased = true;
            $scope.encryptedMessage = encryptedMessage;

            // auto-purchased, update budget
            if($scope.budget) {
              return svcBudget.getOne(
                $scope.budget.id, {force: true}, function(err, budget) {
                  if(!err) {
                    $scope.budget = budget;
                  }
                  callback();
                });
            }

            callback();
          },
          error: callback
        });
      }
    ], function(err) {
      if(err) {
        // clear any auto-purchase budget
        $scope.budget = null;
      }
      callback(err);
    });
  }

  // try to find budget for a contract
  function budgetForContract() {
    var budgets = $scope.budgets;
    var assetProvider = $scope.contract.assetProvider.id;
    for(b in budgets) {
      var budget = budgets[b];
      for(v in budget.vendor) {
        var vendor = budget.vendor[v];
        if(vendor === assetProvider) {
          // found budget for this vendor
          return budget;
        }
      }
    }
    return null;
  }

  // auto-purchase w/existing budget
  function autoPurchase(callback) {
    // FIXME: should do another call to check for id+vendor budget instead?
    // FIXME: add "always confirm" option to budgets and/or to identity prefs
    // check budgets for this vendor, if it exists, auto submit purchase
    var budget = budgetForContract();
    if(budget) {
      // budget found, try auto-purchase
      $scope.budget = budget;
      return purchase(budget.source, callback);
    }
    callback();
  }

  // handle results of a purchase attempt
  function purchaseCallback(err, result) {
    $scope.error = null;
    if(err) {
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
            svcAccount.getOne(accountId, function(err, account) {
              if(err) {
                $scope.error = err;
                return
              }
              $scope.selection.account = account;
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
        default:
          // all other errors
          $scope.error = err;
      }
    }
    $scope.$apply();
  }
});

})();
