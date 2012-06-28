/*!
 * Payment Support
 *
 * @requires jQuery v1.6+ (http://jquery.com/)
 *
 * @author David I. Lehn <dlehn@digitalbazaar.com>
 * @author Dave Longley
 * @author Manu Sporny
 */
(function($) {

var data;
var autoPostToVendor = false;

$(document).ready(function() {
  data = window.data;
  var identity = data.identity = data.session.identity.id;

  async.auto({
    checkAddresses: function(callback) {
      checkAddresses(identity, callback);
    },
    checkAccounts: ['checkAddresses', function(callback) {
      checkAccounts(identity, callback);
    }],
    getQuote: ['checkAccounts', function(callback) {
      updateQuote(data.accounts[0].id, callback);
    }],
    getBudgets: function(callback) {
      payswarm.budgets.get({
        identity: identity,
        success: function(budgets) {
          data.budgets = budgets;
          callback();
        },
        error: callback
      });
    },
    autoPurchase: ['getBudgets', 'getQuote', function(callback) {
      autoPurchase(identity, callback);
    }],
    installAccountSelector: ['autoPurchase', function(callback) {
      selectors.account.install({
        target: $('#pay-account-selector'),
        identity: identity,
        accounts: data.accounts,
        addModal: true,
        ready: function() {
          checkAccountBalance($('#pay-account-selector')[0].selected),
          callback();
        },
        change: checkAccountBalance,
        error: callback
      });
    }],
    installBudgetSelector: ['checkAccounts', 'autoPurchase',
      function(callback) {
        // build account map
        var accountMap = {};
        for(var ai in data.accounts) {
          var account = data.accounts[ai];
          accountMap[account.id] = account;
        }

        selectors.budget.install({
          target: $('#pay-budget-selector'),
          identity: identity,
          budgets: data.budgets,
          accountMap: accountMap,
          addModal: true,
          ready: function() {
            $('#pay-budget-selector').hide();
            callback();
          },
          change: checkBudgetBalance,
          error: callback
        });
    }],
    showPayment: ['installAccountSelector', 'installBudgetSelector',
      function(callback) {
        showPayment(identity, callback);
    }]
  }, function(err) {
    if(err) {
      // handle duplicate purchase
      if(err.type === 'payswarm.website.DuplicatePurchase') {
        processDuplicatePurchase(
          err.details.contract, err.details.encryptedMessage);
      }
      // error other than auto-purchase
      else if(err.type !== 'payswarm.website.AutoPurchase') {
        website.util.processErrors(
          $('#pay-feedback'), $('#pay-feedback'), err, true);
      }
    }
  });
});

function checkAddresses(identity, callback) {
  // get identity's addresses
  payswarm.addresses.get({
    identity: identity,
    success: function(addresses) {
      if(addresses.length === 0) {
        // show add address modal if no addresses are set
        window.modals.addAddress.show({
          identity: identity,
          showAlert: 'purchase',
          added: function(address) {
            callback();
          },
          canceled: function() {
            callback({
              type: 'payswarm.website.NoAddress',
              message:
                'You must provide a name and address before ' +
                'performing any financial transactions.'
            });
          }
        });
      }
      else {
        callback();
      }
    },
    error: callback
  });
}

function checkAccounts(identity, callback) {
  // get identity's accounts
  payswarm.accounts.get({
    identity: identity,
    success: function(accounts) {
      data.accounts = accounts;
      if(accounts.length === 0) {
        // show add account modal if no accounts are set
        window.modals.addAccount.show({
          identity: identity,
          showAlert: 'purchase',
          added: function(account) {
            accounts.push(account);
            callback(null, accounts);
          },
          canceled: function() {
            callback({
              type: 'payswarm.website.NoAccount',
              message:
                'You must create a financial account before ' +
                'performing any financial transactions.'
            });
          }
        });
      }
      else {
        callback(null, accounts);
      }
    },
    error: callback
  });
}

function autoPurchase(identity, callback) {
  // FIXME: should another call to check for id+vendor budget be done instead?
  // FIXME: add "always confirm" option to budgets and/or to identity prefs
  // check budgets for this vendor, if it exists, auto submit purchase
  var budgets = data.budgets;
  var assetProvider = data.contract.assetProvider.id;
  for(b in budgets) {
    var budget = budgets[b];
    for(v in budget.vendor) {
      var vendor = budget.vendor[v];
      if(vendor === assetProvider) {
        // found budget for this vendor, auto-purchase
        return purchase(budget.source, function(err) {
          err = err || {
            type: 'payswarm.website.AutoPurchase',
            message: 'Item was auto-purchased.'
          };
          callback(err);
        });
      }
    }
  }

  callback();
}

function showPayment(identity, callback) {
  // handle change of pay type
  $('#pay-form [name="pay-type"]').change(function() {
    var type = $(this).val();
    if(type === 'once') {
      $('#pay-budget-selector').hide();
      $('#pay-account-selector').show();
      checkAccountBalance($('#pay-account-selector')[0].selected);
    }
    else {
      $('#pay-account-selector').hide();
      $('#pay-budget-selector').show();
      checkBudgetBalance($('#pay-budget-selector')[0].selected);
    }
  });

  // bind purchase button
  $('#payment [name="button-purchase"]').click(function() {
    var payType = $('#pay-form [name="pay-type"]:checked').val();
    if(payType === 'budget') {
      // first add vendor to budget
      var budget = $('#pay-budget-selector')[0].selected;
      payswarm.budgets.addVendor({
        budget: budget.id,
        vendor: data.contract.assetProvider.id,
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
    else {
      // do purchase
      purchase($('#pay-account-selector')[0].selected.id);
    }
  });

  // bind cancel button
  $('#payment [name="button-cancel-purchase"]').click(function() {
    // FIXME: redirect to vendor w/'canceled purchase' message
  });

  $('#payment').show();

  callback();
}

/**
 * Updates a quote based on the listing and updates the UI. The price may
 * only change based on identity, not on financial account. This means that
 * the quote only needs to be regenerated once the purchase is initiated and
 * only if a different account from the original quote was selected (either
 * through the account selector or the budget selector).
 *
 * @param account the account to use to generate the quote.
 * @param callback called once the operation completes.
 */
function updateQuote(account, callback) {
  var payType = $('#pay-form [name="pay-type"]:checked').val();
  payswarm.transactions.getQuote({
    purchaseRequest: (function() {
      var rval = {
        '@context': 'http://purl.org/payswarm/v1',
        listing: data.listing,
        listingHash: data.listingHash,
        source: account
      };
      if('referenceId' in data && data.referenceId !== null) {
        rval.referenceId = data.referenceId;
      }
      else if(data.allowDuplicatePurchases) {
        rval.referenceId = String(+new Date());
      }
      if('nonce' in data) {
        rval.nonce = data.nonce;
      }
      return rval;
    })(),
    success: function(contract) {
      $('#pay-feedback').hide();
      data.contract = contract;
      $('#pay-quote').empty().append($.tmpl('quote-tmpl', {
        tmpl: window.tmpl,
        contract: contract
      }));
      // enable payment details toggle
      $('.pay-quote-details-toggle').click(function() {
        $('.pay-quote-details').toggle();
        return false;
      });
      callback();
    },
    error: callback
  });
}

function checkAccountBalance(account) {
  // ensure account balance is >= contract price
  var balance = parseFloat(account.balance);
  var price = parseFloat(data.contract.amount);
  if(balance < price) {
    // insufficient funds, show deposit
    console.warn('FIXME: insufficient funds, show deposit modal');
  }
}

function checkBudgetBalance(budget) {
  // ensure budget balance is >= contract price
  var balance = parseFloat(budget.balance);
  var price = parseFloat(data.contract.amount);
  if(balance < price) {
    // insufficient funds, show edit budget modal
    console.warn('FIXME: insufficient funds, show edit budget modal');
  }
  // check associated account balance
  else {
    for(var i in data.accounts) {
      var account = data.accounts[i];
      if(budget.source === account.id) {
        checkAccountBalance(account);
        break;
      }
    }
  }
}

function purchase(account, callback) {
  async.waterfall([
    function checkQuote(callback) {
      // ensure account matches quote
      var source = data.contract.transfer[0].source;
      if(account !== source) {
        updateQuote(account, callback);
      }
      else {
        callback();
      }
    },
    function(callback) {
      payswarm.transactions.purchase({
        purchaseRequest: (function() {
          var rval = {
            '@context': 'http://purl.org/payswarm/v1',
            type: 'ps:PurchaseRequest',
            transactionId: data.contract.id
          };
          if('nonce' in data) {
            rval.nonce = data.nonce;
          }
          return rval;
        })(),
        success: function(encryptedMessage) {
          postToVendor(false, encryptedMessage);
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
  ], function(err) {
    if(callback) {
      callback(err);
    }
  });
}

function postToVendor(duplicate, encryptedMessage) {
  console.log("EncryptedReceipt", encryptedMessage);

  // show purchase complete template
  $('#payment').empty().append($('#purchase-complete-tmpl').tmpl(
    $.extend({
      duplicate: duplicate,
      encryptedMessage: JSON.stringify(encryptedMessage)
    }, data.callback ? {callback: data.callback} : {})
  ));

  // show contract for purchased item
  $('#pay-quote').empty().append($.tmpl('quote-tmpl', {
    tmpl: window.tmpl,
    contract: data.contract
  }));
  // enable payment details toggle
  $('.pay-quote-details-toggle').click(function() {
    $('.pay-quote-details').toggle();
    return false;
  });

  // handle forms
  $('#payment [name="button-complete-purchase"]').click(function() {
    $('#vendor-form').submit();
  });
  $('#payment').show();
  if(autoPostToVendor) {
    $('#vendor-form').submit();
  }
}

function processDuplicatePurchase(contract, encryptedMessage) {
  console.log("Duplicate Purchase:", contract, encryptedMessage);

  $('#pay-feedback').hide();

  // set duplicate contract
  data.contract = contract;
  postToVendor(true, encryptedMessage);
}

})(jQuery);
