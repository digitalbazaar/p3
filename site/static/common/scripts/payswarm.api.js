/*!
 * PaySwarm API
 * 
 * This file provides methods to get data from and post data to the server.
 *
 * @requires jQuery v1.6+ (http://jquery.com/)
 *
 * @author Dave Longley
 */
(function($) {

// payswarm API
var payswarm = window.payswarm = window.payswarm || {};

// addresses API
payswarm.addresses = {};

/**
 * Get the addresses for an identity.
 * 
 * Usage:
 * 
 * payswarm.addresses.get({
 *   identity: 'https://example.com/i/myidentity',
 *   success: function(addresses) {},
 *   error: function(err) {}
 * });
 */
payswarm.addresses.get = function(options) {
  $.ajax({
    async: true,
    type: 'GET',
    url: options.identity + '/addresses',
    dataType: 'json',
    success: function(response, statusText) {
      if(options.success) {
        options.success(response);
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      // if 404, assume no addresses
      if(xhr.status === 404) {
        if(options.success) {
          options.success([]);
        }
      }
      else if(options.error) {
        options.error(website.util.normalizeError(xhr, textStatus));
      }
    }
  });
};

/**
 * Validates an address for an identity.
 * 
 * Usage:
 * 
 * payswarm.addresses.validate({
 *   identity: 'https://example.com/i/myidentity',
 *   address: address,
 *   success: function(address) {},
 *   error: function(err) {}
 * });
 */
payswarm.addresses.validate = function(options) {
  $.ajax({
    async: true,
    type: 'POST',
    url: options.identity + '/addresses?validate=true',
    dataType: 'json',
    contentType: 'application/json',
    data: JSON.stringify(options.address),
    success: function(response, statusText) {
      if(options.success) {
        options.success(response);
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      if(options.error) {
        options.error(website.util.normalizeError(xhr, textStatus));
      }
    }
  });
};

/**
 * Add an address to an identity.
 * 
 * Usage:
 * 
 * payswarm.addresses.add({
 *   identity: 'https://example.com/i/myidentity',
 *   address: address,
 *   success: function(address) {},
 *   error: function(err) {}
 * });
 */
payswarm.addresses.add = function(options) {
  $.ajax({
    async: true,
    type: 'POST',
    url: options.identity + '/addresses',
    dataType: 'json',
    contentType: 'application/json',
    data: JSON.stringify(options.address),
    success: function(response, statusText) {
      if(options.success) {
        options.success(response);
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      if(options.error) {
        options.error(website.util.normalizeError(xhr, textStatus));
      }
    }
  });
};

// accounts API
payswarm.accounts = {};

/**
 * Get the accounts for an identity.
 * 
 * Usage:
 * 
 * payswarm.accounts.get({
 *   identity: 'https://example.com/i/myidentity',
 *   success: function(accounts) {},
 *   error: function(err) {}
 * });
 */
payswarm.accounts.get = function(options) {
  $.ajax({
    async: true,
    type: 'GET',
    url: options.identity + '/accounts',
    dataType: 'json',
    success: function(response, statusText) {
      if(options.success) {
        options.success(response);
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      if(options.error) {
        options.error(website.util.normalizeError(xhr, textStatus));
      }
    }
  });
};

/**
 * Get an account.
 * 
 * Usage:
 * 
 * payswarm.accounts.getOne({
 *   account: 'ACCOUNT_ID',
 *   success: function(account) {},
 *   error: function(err) {}
 * });
 */
payswarm.accounts.getOne = function(options) {
  $.ajax({
    async: true,
    type: 'GET',
    url: options.account,
    dataType: 'json',
    success: function(response, statusText) {
      if(options.success) {
        options.success(response);
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      if(options.error) {
        options.error(website.util.normalizeError(xhr, textStatus));
      }
    }
  });
};

/**
 * Adds an account to an identity.
 * 
 * Usage:
 * 
 * payswarm.accounts.add({
 *   identity: 'https://example.com/i/myidentity',
 *   account: account,
 *   success: function(account) {},
 *   error: function(err) {}
 * });
 */
payswarm.accounts.add = function(options) {
  $.ajax({
    async: true,
    type: 'POST',
    url: options.identity + '/accounts',
    dataType: 'json',
    contentType: 'application/json',
    data: JSON.stringify(options.account),
    success: function(response, statusText) {
      if(options.success) {
        options.success(response);
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      if(options.error) {
        options.error(website.util.normalizeError(xhr, textStatus));
      }
    }
  });
};

/**
 * Updates an account.
 * 
 * Usage:
 * 
 * payswarm.accounts.update({
 *   account: account,
 *   success: function() {},
 *   error: function(err) {}
 * });
 */
payswarm.accounts.update = function(options) {
  $.ajax({
    async: true,
    type: 'POST',
    url: options.account['@id'],
    dataType: 'json',
    contentType: 'application/json',
    data: JSON.stringify(options.account),
    success: function(statusText) {
      if(options.success) {
        options.success();
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      if(options.error) {
        options.error(website.util.normalizeError(xhr, textStatus));
      }
    }
  });
};

// budgets API
payswarm.budgets = {};

/**
 * Get the budgets for an identity.
 * 
 * Usage:
 * 
 * payswarm.budgets.get({
 *   identity: 'https://example.com/i/myidentity',
 *   success: function(budgets) {},
 *   error: function(err) {}
 * });
 */
payswarm.budgets.get = function(options) {
  $.ajax({
    async: true,
    type: 'GET',
    url: options.identity + '/budgets',
    dataType: 'json',
    success: function(response, statusText) {
      if(options.success) {
        options.success(response);
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      if(options.error) {
        options.error(website.util.normalizeError(xhr, textStatus));
      }
    }
  });
};

/**
 * Get a budget.
 * 
 * Usage:
 * 
 * payswarm.budgets.getOne({
 *   budget: BUDGET_ID,
 *   success: function(budget) {},
 *   error: function(err) {}
 * });
 */
payswarm.budgets.getOne = function(options) {
  $.ajax({
    async: true,
    type: 'GET',
    url: options.budget,
    dataType: 'json',
    success: function(response, statusText) {
      if(options.success) {
        options.success(response);
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      if(options.error) {
        options.error(website.util.normalizeError(xhr, textStatus));
      }
    }
  });
};

/**
 * Adds a budget to an identity.
 * 
 * Usage:
 * 
 * payswarm.budgets.add({
 *   identity: 'https://example.com/i/myidentity',
 *   budget: budget,
 *   success: function(budget) {},
 *   error: function(err) {}
 * });
 */
payswarm.budgets.add = function(options) {
  $.ajax({
    async: true,
    type: 'POST',
    url: options.identity + '/budgets',
    dataType: 'json',
    contentType: 'application/json',
    data: JSON.stringify(options.budget),
    success: function(response, statusText) {
      if(options.success) {
        options.success(response);
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      if(options.error) {
        options.error(website.util.normalizeError(xhr, textStatus));
      }
    }
  });
};

/**
 * Updates a budget.
 * 
 * Usage:
 * 
 * payswarm.budgets.update({
 *   budget: budget,
 *   success: function() {},
 *   error: function(err) {}
 * });
 */
payswarm.budgets.update = function(options) {
  $.ajax({
    async: true,
    type: 'POST',
    url: options.budget['@id'],
    dataType: 'json',
    contentType: 'application/json',
    data: JSON.stringify(options.budget),
    success: function(response, statusText) {
      if(options.success) {
        options.success();
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      if(options.error) {
        options.error(website.util.normalizeError(xhr, textStatus));
      }
    }
  });
};

/**
 * Adds a vendor to a budget.
 * 
 * Usage:
 * 
 * payswarm.budgets.addVendor({
 *   budget: budgetId,
 *   vendor: vendorId,
 *   success: function() {},
 *   error: function(err) {}
 * });
 */
payswarm.budgets.addVendor = function(options) {
  $.ajax({
    async: true,
    type: 'POST',
    url: options.budget,
    dataType: 'json',
    contentType: 'application/json',
    data: JSON.stringify({
      'com:vendor': options.vendor
    }),
    success: function(data, textStatus) {
      if(options.success) {
        options.success();
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      if(options.error) {
        options.error(website.util.normalizeError(xhr, textStatus));
      }
    }
  });
};

// deposit API
payswarm.deposit = {};

/**
 * Requests that a deposit be signed.
 * 
 * Usage:
 * 
 * payswarm.paymentTokens.get({
 *   deposit: deposit,
 *   success: function(paymentTokens) {},
 *   error: function(err) {}
 * });
 */
payswarm.deposit.sign = function(options) {
  $.ajax({
    async: true,
    type: 'POST',
    url: '/transactions',
    dataType: 'json',
    contentType: 'application/json',
    data: JSON.stringify(options.deposit),
    success: function(response, statusText) {
      if(options.success) {
        options.success(response);
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      if(options.error) {
        options.error(website.util.normalizeError(xhr, textStatus));
      }
    }
  });
};

/**
 * Confirms a signed deposit.
 * 
 * Usage:
 * 
 * payswarm.deposit.add({
 *   identity: 'https://example.com/i/myidentity',
 *   deposit: deposit,
 *   success: function(paymentToken) {},
 *   error: function(err) {}
 * });
 */
payswarm.deposit.confirm = function(options) {
  $.ajax({
    async: true,
    type: 'POST',
    url: '/transactions',
    dataType: 'json',
    contentType: 'application/json',
    data: JSON.stringify(options.deposit),
    success: function(response, statusText) {
      if(options.success) {
        options.success(response);
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      if(options.error) {
        options.error(website.util.normalizeError(xhr, textStatus));
      }
    }
  });
};

// payment tokens API
payswarm.paymentTokens = {};

/**
 * Get the paymentTokens for an identity.
 * 
 * Usage:
 * 
 * payswarm.paymentTokens.get({
 *   identity: 'https://example.com/i/myidentity',
 *   success: function(paymentTokens) {},
 *   error: function(err) {}
 * });
 */
payswarm.paymentTokens.get = function(options) {
  $.ajax({
    async: true,
    type: 'GET',
    url: options.identity + '/payment-tokens',
    dataType: 'json',
    success: function(response, statusText) {
      if(options.success) {
        options.success(response);
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      if(options.error) {
        options.error(website.util.normalizeError(xhr, textStatus));
      }
    }
  });
};

/**
 * Adds a paymentToken to an identity.
 * 
 * Usage:
 * 
 * payswarm.paymentTokens.add({
 *   identity: 'https://example.com/i/myidentity',
 *   data: {label, gateway, source},
 *   success: function(paymentToken) {},
 *   error: function(err) {}
 * });
 */
payswarm.paymentTokens.add = function(options) {
  $.ajax({
    async: true,
    type: 'POST',
    url: options.identity + '/payment-tokens',
    dataType: 'json',
    contentType: 'application/json',
    data: JSON.stringify(options.data),
    success: function(response, statusText) {
      if(options.success) {
        options.success(response);
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      if(options.error) {
        options.error(website.util.normalizeError(xhr, textStatus));
      }
    }
  });
};

// identities API
payswarm.identities = {};

/**
 * Adds an identity to the current profile.
 * 
 * Usage:
 * 
 * payswarm.identities.add({
 *   identity: identity,
 *   success: function(identity) {},
 *   error: function(err) {}
 * });
 */
payswarm.identities.add = function(options) {
  $.ajax({
    async: true,
    type: 'POST',
    url: '/i',
    dataType: 'json',
    contentType: 'application/json',
    data: JSON.stringify(options.identity),
    success: function(response, statusText) {
      if(options.success) {
        options.success(response);
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      if(options.error) {
        options.error(website.util.normalizeError(xhr, textStatus));
      }
    }
  });
};

// preferences API
payswarm.identities.preferences = {};

/**
 * Updates preference information for a particular identity.
 * 
 * Usage:
 * 
 * payswarm.identities.preferences.update({
 *   identity: identity,
 *   preferences: preferences,
 *   success: function(identity) {},
 *   error: function(err) {}
 * });
 */
payswarm.identities.preferences.update = function(options) {
  $.ajax({
    async: true,
    type: 'POST',
    url: options.identity + '/preferences',
    dataType: 'json',
    contentType: 'application/json',
    data: JSON.stringify(options.preferences),
    success: function(response, statusText) {
      if(options.success) {
        options.success(response);
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      if(options.error) {
        options.error(website.util.normalizeError(xhr, textStatus));
      }
    }
  });
};

/**
 * Retrieves preference information for a particular identity.
 * 
 * Usage:
 * 
 * payswarm.identities.preferences.update({
 *   identity: identity,
 *   responseNonce: nonce,
 *   success: function(preferences) {},
 *   error: function(err) {}
 * });
 */
payswarm.identities.preferences.get = function(options) {
  var prefUrl = options.identity + '/preferences';
  
  if(options.responseNonce) {
    prefUrl += '?response-nonce=' + encodeURIComponent(options.responseNonce);
  }
  
  $.ajax({
    async: true,
    type: 'GET',
    url: prefUrl,
    dataType: 'json',
    success: function(response, statusText) {
      if(options.success) {
        options.success(response);
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      if(options.error) {
        options.error(website.util.normalizeError(xhr, textStatus));
      }
    }
  });
};

/**
 * Switches the current session's identity.
 * 
 * Usage:
 * 
 * payswarm.switchIdentity({
 *   identity: 'https://example.com/i/newidentity',
 *   redirect: 'https://example.com/new/page' (optional),
 *   error: function(err) {}
 * });
 */
payswarm.switchIdentity = function(options) {
  $.ajax({
    async: true,
    type: 'POST',
    url: '/profile/switch',
    contentType: 'application/json',
    dataType: 'json',
    data: JSON.stringify({
      'identity': options.identity,
      'redirect': options.redirect || window.location.href
    }),
    error: function(xhr, textStatus, errorThrown) {
      if(xhr.status === 200) {
        window.location = options.redirect || window.location.href;
      }
    }
  });
};

// transactions API
payswarm.transactions = {};

/**
 * Gets a quote (a Contract) for a purchase.
 * 
 * Usage:
 * 
 * payswarm.transactions.getQuote({
 *   purchaseRequest: {
 *     'ps:listing': 'https://merchant.com/listing-url',
 *     'ps:listingHash': 'ab34e87a8d8f5fde3f23f23',
 *     'com:source': 'https://example.com/i/myid/accounts/primary',
 *     'com:referenceId': '12345' (optional),
 *     'sec:nonce': '12345' (optional)
 *   },
 *   success: function(contract) {},
 *   error: function(err) {}
 * });
 */
payswarm.transactions.getQuote = function(options) {
  $.ajax({
    async: true,
    type: 'POST',
    url: '/transactions?quote=true',
    contentType: 'application/json',
    dataType: 'json',
    data: JSON.stringify(options.purchaseRequest),
    success: function(response, statusText) {
      if(options.success) {
        options.success(response);
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      if(options.error) {
        options.error(website.util.normalizeError(xhr, textStatus));
      }
    }
  });
};

/**
 * Performs a purchase.
 * 
 * Usage:
 * 
 * payswarm.transactions.purchase({
 *   purchaseRequest: {
 *     '@type': 'ps:PurchaseRequest',
 *     'ps:transactionId': 'https://example.com/transactions/1.1.a',
 *     'sec:nonce': '12345' (optional)
 *   },
 *   success: function(contract) {},
 *   error: function(err) {}
 * });
 */
payswarm.transactions.purchase = function(options) {
  $.ajax({
    async: true,
    type: 'POST',
    url: '/transactions',
    contentType: 'application/json',
    dataType: 'json',
    data: JSON.stringify(options.purchaseRequest),
    success: function(response, statusText) {
      if(options.success) {
        options.success(response);
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      if(options.error) {
        options.error(website.util.normalizeError(xhr, textStatus));
      }
    }
  });
};

// profiles API
payswarm.profiles = {};

/**
 * Logs in a profile.
 * 
 * Usage:
 * 
 * payswarm.profiles.login({
 *   profile: (nick:name or foaf:mbox),
 *   password: password,
 *   ref: '/redirect/url' (optional),
 *   success: function(response) {},
 *   error: function(err) {}
 * });
 */
payswarm.profiles.login = function(options) {
  $.ajax({
    async: true,
    type: 'POST',
    url: '/profile/login',
    dataType: 'json',
    contentType: 'application/json',
    data: JSON.stringify($.extend({
      profile: options.profile,
      password: options.password,
    }, ('ref' in options && options.ref !== undefined) ?
      {ref: options.ref} : {})),
    success: function(response, statusText) {
      if(options.success) {
        options.success(response);
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      if(options.error) {
        options.error(website.util.normalizeError(xhr, textStatus));
      }
    }
  });
};

/**
 * Sends a password reset e-mail to the provided and e-mail address or
 * a profile name.
 * 
 * Usage:
 * 
 * payswarm.profiles.passcode({
 *   profile: {"psa:identifier": "foo@example.com"},
 *   success: function(contract) {},
 *   error: function(err) {}
 * });
 */
payswarm.profiles.passcode = function(options) {
  $.ajax({
    async: true,
    type: 'POST',
    url: '/profile/passcode',
    contentType: 'application/json',
    dataType: 'json',
    data: JSON.stringify(options.profile),
    success: function(response, statusText) {
      if(options.success) {
        options.success(response);
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      if(options.error) {
        options.error(website.util.normalizeError(xhr, textStatus));
      }
    }
  });
};

/**
 * Sets a password given an 
 * e-mail to the provided and e-mail address or
 * a profile name.
 * 
 * Usage:
 * 
 * payswarm.profiles.password({
 *   profile: {
 *     "psa:identifier": "foo@example.com",
 *     "psa:passcode": "fhj32hfg8",
 *     "psa:passwordNew": "password12345",
 *     },
 *   success: function(contract) {},
 *   error: function(err) {}
 * });
 */
payswarm.profiles.password = function(options) {
  $.ajax({
    async: true,
    type: 'POST',
    url: '/profile/password/reset',
    contentType: 'application/json',
    dataType: 'json',
    data: JSON.stringify(options.profile),
    success: function(response, statusText) {
      if(options.success) {
        options.success(response);
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      if(options.error) {
        options.error(website.util.normalizeError(xhr, textStatus));
      }
    }
  });
};

})(jQuery);
