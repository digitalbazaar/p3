/*!
 * Selectors API
 *
 * @requires jQuery v1.6+ (http://jquery.com/)
 *
 * @author Dave Longley
 */
(function($) {

var selectors = window.selectors = window.selectors || {};

/**
 * Installs a selector.
 * 
 * Typical usage:
 * 
 * selectors.install({
 *   target: $('#div-to-replace'),
 *   itemType: 'My Item Type',
 *   items: [item],
 *   selectedIndex: 0 (optional),
 *   itemTemplate: 'my-item-tmpl',
 *   parentModal: $('#parent-modal') (optional),
 *   addModal: modals.addItem,
 *   change: function(item) {},
 *   added: function(item) {}
 * });
 * var item = $('#div-to-replace')[0].selected;
 */
selectors.install = function(options) {
  var target = options.target;
  var id = target.attr('id');
  target.replaceWith($.tmpl('selector-tmpl', {
    id: id,
    itemType: options.itemType,
    items: options.items,
    selectedIndex: options.selectedIndex || 0,
    itemTemplate: options.itemTemplate,
    addModal: ('addModal' in options && options.addModal !== false),
    tmpl: window.tmpl
  }));
  target = options.target = $('#' + id);
  
  target.on('slid', function() {
    changed(options);
  });
  $('[name="selector-add"]', target).click(function(e) {
    e.preventDefault();
    var addModalOptions = $.extend({}, options.addModalOptions, {
      parentModal: options.parentModal,
      added: function(item) {
        // append item and reinstall
        options.items.push(item);
        options.selectedIndex = options.items.length - 1;
        selectors.install(options);
        if(options.added) {
          options.added(item);
        }
      }
    });
    options.addModal.show(addModalOptions);
  });
  
  // set selected item
  if(options.items.length > 0) {
    var idx = $('.item', target).filter('.active').attr('data-item-index');
    target[0].selected = options.items[idx];
  }
  else {
    target[0].selected = null;
  }
  
  return target;
};

function changed(options) {
  var target = options.target;
  var idx = $('.item', target).filter('.active').attr('data-item-index');
  options.selectedIndex = idx;
  target[0].selected = options.items[idx];
  if(options.change) {
    options.change(target[0].selected);
  }
}

/**
 * Installs an Address selector.
 * 
 * Typical usage:
 * 
 * selectors.address.install({
 *   target: $('#div-to-replace'),
 *   identity: 'https://example.com/i/myidentity',
 *   addresses: [address] (optional),
 *   parentModal: $('#parent-modal') (optional),
 *   addModal: true/false,
 *   ready: function() {},
 *   error: function() {},
 *   change: function(address) {},
 *   added: function(address) {}
 * });
 * var address = $('#div-to-replace')[0].selected;
 */
selectors.address = {};
selectors.address.install = function(options) {
  var install = function(options) {
    selectors.install({
      target: options.target,
      itemType: 'Address',
      items: options.addresses,
      itemTemplate: 'address-display-tmpl',
      parentModal: options.parentModal,
      addModal: (options.addModal ? modals.addAddress : false),
      addModalOptions: {
        identity: options.identity
      },
      change: options.change,
      added: options.added
    });
    if(options.ready) {
      options.ready();
    }
  };
  if('addresses' in options) {
    install(options);
  }
  else {
    payswarm.addresses.get({
      identity: options.identity,
      success: function(addresses) {
        options.addresses = addresses;
        install(options);
      },
      error: options.error
    });
  }
};

/**
 * Installs an Account selector.
 * 
 * Typical usage:
 * 
 * selectors.account.install({
 *   target: $('#div-to-replace'),
 *   identity: 'https://example.com/i/myidentity',
 *   accounts: [account] (optional),
 *   selectedAccount: ACCOUNT_ID (optional),
 *   parentModal: $('#parent-modal') (optional),
 *   addModal: true/false,
 *   ready: function() {},
 *   error: function() {},
 *   change: function(account) {},
 *   added: function(account) {}
 * });
 * var account = $('#div-to-replace')[0].selected;
 */
selectors.account = {};
selectors.account.install = function(options) {
  var install = function(options) {
    var selectedIndex = 0;
    if(options.selectedAccount) {
      // FIXME: handle not found case
      for(var idx = 0; idx < options.accounts.length; idx++) {
        if(options.accounts[idx]['@id'] === options.selectedAccount) {
          selectedIndex = idx;
          break;
        }
      }
    }
    var selectorOptions = {
      target: options.target,
      itemType: 'Account',
      items: options.accounts,
      itemTemplate: 'account-display-tmpl',
      selectedIndex: selectedIndex,
      parentModal: options.parentModal,
      addModal: (options.addModal ? modals.addAccount : false),
      addModalOptions: {
        identity: options.identity
      },
      change: options.change,
      added: function(account) {
        // bind deposit ui
        options.target = selectorOptions.target;
        bindAccountSelectorDeposit(options);
        if(options.added) {
          options.added(account);
        }
      }
    };
    options.target = selectors.install(selectorOptions);
    bindAccountSelectorDeposit(options);
    
    if(options.ready) {
      options.ready();
    }
  };
  if('accounts' in options) {
    install(options);
  }
  else {
    payswarm.accounts.get({
      identity: options.identity,
      success: function(accounts) {
        options.accounts = accounts;
        install(options);
      },
      error: options.error
    });
  }
};

var bindAccountSelectorDeposit = function(options) {
  // bind deposit ui
  var target = options.target;
  $('[name="account-selector-deposit"]', target).off().click(function(e) {
    e.preventDefault();
    var selected = target[0].selected;
    modals.deposit.show({
      identity: options.identity,
      account: selected['@id'],
      deposited: function(deposit) {
        payswarm.accounts.getOne({
          account: selected['@id'],
          success: function(account) {
            // update account balance and reinstall
            selected['com:balance'] = account['com:balance'];
            options.target = target;
            options.selectedAccount = selected['@id'];
            var optionsReadyOld = options.ready;
            options.ready = function() {
              options.ready = optionsReadyOld;
            };
            selectors.account.install(options);
          }
        });
      }
    });
  });
};

/**
 * Installs a PaymentToken selector.
 * 
 * Typical usage:
 * 
 * selectors.paymentToken.install({
 *   target: $('#div-to-replace'),
 *   identity: 'https://example.com/i/myidentity',
 *   paymentTokens: [paymentToken] (optional),
 *   parentModal: $('#parent-modal') (optional),
 *   addModal: true/false,
 *   ready: function() {},
 *   error: function() {},
 *   change: function(paymentToken) {},
 *   added: function(paymentToken) {}
 * });
 * var paymentToken = $('#div-to-replace')[0].selected;
 */
selectors.paymentToken = {};
selectors.paymentToken.install = function(options) {
  var install = function(options) {
    selectors.install({
      target: options.target,
      itemType: 'Payment Method',
      items: options.paymentTokens,
      itemTemplate: 'payment-token-display-tmpl',
      parentModal: options.parentModal,
      addModal: (options.addModal ? modals.addPaymentToken : false),
      addModalOptions: {
        identity: options.identity
      },
      change: options.change,
      added: options.added
    });
    if(options.ready) {
      options.ready();
    }
  };
  if('paymentTokens' in options) {
    install(options);
  }
  else {
    payswarm.paymentTokens.get({
      identity: options.identity,
      success: function(paymentTokens) {
        options.paymentTokens = paymentTokens;
        install(options);
      },
      error: options.error
    });
  }
};

/**
 * Installs a Budget selector.
 * 
 * Typical usage:
 * 
 * selectors.budget.install({
 *   target: $('#div-to-replace'),
 *   identity: 'https://example.com/i/myidentity',
 *   budgets: [budget] (optional),
 *   parentModal: $('#parent-modal') (optional),
 *   addModal: true/false,
 *   ready: function() {},
 *   error: function() {},
 *   change: function(budget) {},
 *   added: function(budget) {}
 * });
 * var budget = $('#div-to-replace')[0].selected;
 */
selectors.budget = {};
selectors.budget.install = function(options) {
  var install = function(options) {
    selectors.install({
      target: options.target,
      itemType: 'Budget',
      items: options.budgets,
      itemTemplate: 'budget-display-tmpl',
      parentModal: options.parentModal,
      addModal: (options.addModal ? modals.addBudget : false),
      addModalOptions: {
        identity: options.identity
      },
      change: options.change,
      added: options.added
    });
    if(options.ready) {
      options.ready();
    }
  };
  if('budgets' in options) {
    install(options);
  }
  else {
    payswarm.budgets.get({
      identity: options.identity,
      success: function(budgets) {
        options.budgets = budgets;
        install(options);
      },
      error: options.error
    });
  }
};

/**
 * Installs an Identity selector.
 * 
 * Typical usage:
 * 
 * selectors.identity.install({
 *   target: $('#div-to-replace'),
 *   identities: [identity] (optional),
 *   parentModal: $('#parent-modal') (optional),
 *   addModal: true/false,
 *   ready: function() {},
 *   error: function() {},
 *   change: function(identity) {},
 *   added: function(identity) {}
 * });
 * var identity = $('#div-to-replace')[0].selected;
 */
selectors.identity = {};
selectors.identity.install = function(options) {
  var install = function(options) {
    selectors.install({
      target: options.target,
      itemType: 'Identity',
      items: options.identities,
      itemTemplate: 'identity-display-tmpl',
      parentModal: options.parentModal,
      addModal: (options.addModal ? modals.addIdentity : false),
      addModalOptions: {
        identity: options.identity
      },
      change: options.change,
      added: options.added
    });
    if(options.ready) {
      options.ready();
    }
  };
  if('identities' in options) {
    install(options);
  }
  else {
    // use identities from session
    options.identities = $.map(
      window.data.session.identities, function(v) {return v;});
    install(options);
  }
};

})(jQuery);
