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
  $scope, svcAccount, svcBudget, svcAddress) {
  // init model
  var data = window.data;
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
  $scope.purchased = false;
  $scope.selection = {
    account: null,
    budget: null
  };
  // default to one-time purchase
  $scope.sourceType = 'account';

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
          // now do purchase
          purchase(budget.source);
        },
        error: function(err) {
          // FIXME: better error handling
          //console.log('error', err);
        }
      });
    }

    // do account-based purchase
    purchase($scope.selection.account.id);
  };

  async.auto({
    getAddresses: function(callback) {
      svcAddress.get({force: true}, function(err, addresses) {
        if(!err && addresses.length === 0) {
          err = {
            type: 'payswarm.website.NoAddress',
            message:
              'You must provide a name and address before ' +
              'performing any financial transactions.'
          };
        }
        callback(err);
      });
    },
    getAccounts: function(callback) {
      svcAccount.get({force: true}, function(err, accounts) {
        if(!err && accounts.length === 0) {
          err = {
            type: 'payswarm.website.NoAccount',
            message:
              'You must create a financial account before ' +
              'performing any financial transactions.'
          };
        }
        callback(err);
      });
    },
    getBudgets: function(callback) {
      svcBudget.get({force: true}, callback);
    },
    getQuote: ['getAddresses', 'getAccounts', function(callback) {
      $scope.selection.account = $scope.accounts[0];
      updateQuote($scope.selection.account.id, callback);
    }],
    autoPurchase: ['getBudgets', 'getQuote', function(callback) {
      $scope.selection.budget = null;
      autoPurchase(callback);
    }]
  }, function(err) {
    if(err) {
      // handle duplicate purchase
      if(err.type === 'payswarm.website.DuplicatePurchase') {
        // set duplicate contract
        $scope.purchased = true;
        $scope.contract = err.details.contract;
        $scope.encryptedMessage = err.details.encryptedMessage;
      }
      // error other than auto-purchase
      else if(err.type !== 'payswarm.website.AutoPurchase') {
        // FIXME: use directive
        website.util.processErrors(
          $('#pay-feedback'), $('#pay-feedback'), err, true);
      }
    }
  });

  /**
   * Updates a quote based on the listing. The price may only change based on
   * identity, not on financial account. This means that the quote only needs
   * to be regenerated once the purchase is initiated and only if a different
   * account from the original quote was selected (either through the account
   * selector or the budget selector).
   *
   * @param source the source account or budget to use to generate the quote.
   * @param callback called once the operation completes.
   */
  function updateQuote(source, callback) {
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
            $scope.purchased = true;
            $scope.encryptedMessage = encryptedMessage;
            callback();
          },
          error: function(err) {
            // FIXME: better error handling
            //console.log('error', err);
            if(err.type === 'payswarm.financial.BudgetExceeded') {
              console.warn('Handle budget exceeded exception:',
                err.details.budget);
            }
            else {
              callback(err);
            }
          }
        });
      }
    ], callback);
  }

  // auto-purchase w/existing budget
  function autoPurchase(callback) {
    // FIXME: should do another call to check for id+vendor budget instead?
    // FIXME: add "always confirm" option to budgets and/or to identity prefs
    // check budgets for this vendor, if it exists, auto submit purchase
    var budgets = $scope.budgets;
    var assetProvider = $scope.contract.assetProvider.id;
    for(b in budgets) {
      var budget = budgets[b];
      for(v in budget.vendor) {
        var vendor = budget.vendor[v];
        if(vendor === assetProvider) {
          // found budget for this vendor, auto-purchase
          return purchase(budget.source, function(err) {
            callback(err || {
              type: 'payswarm.website.AutoPurchase',
              message: 'Item was auto-purchased.'
            });
          });
        }
      }
    }
    callback();
  }
});

})();
