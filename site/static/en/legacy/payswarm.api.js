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
        options.error(normalizeError(xhr, textStatus));
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
    url: options.identity + '/addresses?action=validate',
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
        options.error(normalizeError(xhr, textStatus));
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
        options.error(normalizeError(xhr, textStatus));
      }
    }
  });
};

/**
 * Deletes an address from an identity.
 *
 * Usage:
 *
 * payswarm.addresses.del({
 *   address: address,
 *   success: function() {},
 *   error: function(err) {}
 * });
 */
payswarm.addresses.del = function(options) {
  $.ajax({
    async: true,
    type: 'DELETE',
    url: options.identity + '/addresses?addressId=' +
      encodeURIComponent(options.addressId),
    success: function(data, textStatus) {
      if(options.success) {
        options.success();
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      if(options.error) {
        options.error(normalizeError(xhr, textStatus));
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
        options.error(normalizeError(xhr, textStatus));
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
        options.error(normalizeError(xhr, textStatus));
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
        options.error(normalizeError(xhr, textStatus));
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
    url: options.account.id,
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
        options.error(normalizeError(xhr, textStatus));
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
        options.error(normalizeError(xhr, textStatus));
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
        options.error(normalizeError(xhr, textStatus));
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
        options.error(normalizeError(xhr, textStatus));
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
    url: options.budget.id,
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
        options.error(normalizeError(xhr, textStatus));
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
      '@context': 'http://purl.org/payswarm/v1',
      vendor: options.vendor
    }),
    success: function(data, textStatus) {
      if(options.success) {
        options.success();
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      if(options.error) {
        options.error(normalizeError(xhr, textStatus));
      }
    }
  });
};

/**
 * Delete a vendor from a budget.
 *
 * Usage:
 *
 * payswarm.budgets.delVendor({
 *   budget: budgetId,
 *   vendor: vendorId,
 *   success: function() {},
 *   error: function(err) {}
 * });
 */
payswarm.budgets.delVendor = function(options) {
  $.ajax({
    async: true,
    type: 'DELETE',
    url: options.budget + '?' + $.param({
      vendor: options.vendor
    }),
    dataType: 'json',
    success: function(data, textStatus) {
      if(options.success) {
        options.success();
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      if(options.error) {
        options.error(normalizeError(xhr, textStatus));
      }
    }
  });
};

/**
 * Gets the vendors for a budget.
 *
 * Usage:
 *
 * payswarm.budgets.getVendors({
 *   budget: 'BUDGET_ID',
 *   success: function(vendors) {},
 *   error: function(err) {}
 * });
 */
payswarm.budgets.getVendors = function(options) {
  $.ajax({
    async: true,
    type: 'GET',
    url: options.budget + '?view=vendors',
    dataType: 'json',
    success: function(response, statusText) {
      if(options.success) {
        options.success(response);
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      if(options.error) {
        options.error(normalizeError(xhr, textStatus));
      }
    }
  });
};

/**
 * Deletes a budget.
 *
 * Usage:
 *
 * payswarm.budgets.del({
 *   budget: budgetId,
 *   success: function() {},
 *   error: function(err) {}
 * });
 */
payswarm.budgets.del = function(options) {
  $.ajax({
    async: true,
    type: 'DELETE',
    url: options.budget,
    success: function(data, textStatus) {
      if(options.success) {
        options.success();
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      if(options.error) {
        options.error(normalizeError(xhr, textStatus));
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
 * payswarm.deposit.sign({
 *   deposit: deposit,
 *   success: function(deposit) {},
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
        options.error(normalizeError(xhr, textStatus));
      }
    }
  });
};

/**
 * Confirms a signed deposit, submitting it for processing.
 *
 * Usage:
 *
 * payswarm.deposit.confirm({
 *   deposit: deposit,
 *   success: function(deposit) {},
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
        options.error(normalizeError(xhr, textStatus));
      }
    }
  });
};

// withdrawal API
payswarm.withdrawal = {};

/**
 * Requests that a withdrawal be signed.
 *
 * Usage:
 *
 * payswarm.withdrawal.sign({
 *   withdrawal: withdrawal,
 *   success: function(withdrawal) {},
 *   error: function(err) {}
 * });
 */
payswarm.withdrawal.sign = function(options) {
  $.ajax({
    async: true,
    type: 'POST',
    url: '/transactions',
    dataType: 'json',
    contentType: 'application/json',
    data: JSON.stringify(options.withdrawal),
    success: function(response, statusText) {
      if(options.success) {
        options.success(response);
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      if(options.error) {
        options.error(normalizeError(xhr, textStatus));
      }
    }
  });
};

/**
 * Confirms a signed withdrawal, submitting it for processing.
 *
 * Usage:
 *
 * payswarm.withdrawal.confirm({
 *   withdrawal: withdrawal,
 *   success: function(withdrawal) {},
 *   error: function(err) {}
 * });
 */
payswarm.withdrawal.confirm = function(options) {
  $.ajax({
    async: true,
    type: 'POST',
    url: '/transactions',
    dataType: 'json',
    contentType: 'application/json',
    data: JSON.stringify(options.withdrawal),
    success: function(response, statusText) {
      if(options.success) {
        options.success(response);
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      if(options.error) {
        options.error(normalizeError(xhr, textStatus));
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
        options.error(normalizeError(xhr, textStatus));
      }
    }
  });
};

/**
 * Get a payment token.
 *
 * Usage:
 *
 * payswarm.paymentTokens.getOne({
 *   paymenToken: 'TOKEN_ID',
 *   success: function(account) {},
 *   error: function(err) {}
 * });
 */
payswarm.paymentTokens.getOne = function(options) {
  $.ajax({
    async: true,
    type: 'GET',
    url: options.paymentToken,
    dataType: 'json',
    success: function(response, statusText) {
      if(options.success) {
        options.success(response);
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      if(options.error) {
        options.error(normalizeError(xhr, textStatus));
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
 *   @context: 'http://purl.org/payswarm/v1',
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
        options.error(normalizeError(xhr, textStatus));
      }
    }
  });
};

/**
 * Deletes a paymentToken. If the token is only marked for later removal
 * then it will be returned with the up-to-date expiration information in
 * the success call.
 *
 * Usage:
 *
 * payswarm.paymentTokens.del({
 *   paymentToken: paymentTokenId,
 *   success: function(token) {},
 *   error: function(err) {}
 * });
 */
payswarm.paymentTokens.del = function(options) {
  $.ajax({
    async: true,
    type: 'DELETE',
    url: options.paymentToken,
    success: function(data, textStatus) {
      if(options.success) {
        options.success(data);
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      if(options.error) {
        options.error(normalizeError(xhr, textStatus));
      }
    }
  });
};

/**
 * Restores a deleted, but unexpired, paymentToken.
 *
 * Usage:
 *
 * payswarm.paymentTokens.restore({
 *   paymentToken: paymentTokenId,
 *   success: function(token) {},
 *   error: function(err) {}
 * });
 */
payswarm.paymentTokens.restore = function(options) {
  $.ajax({
    async: true,
    type: 'POST',
    url: options.paymentToken + '?action=restore',
    success: function(data, textStatus) {
      if(options.success) {
        options.success(data);
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      if(options.error) {
        options.error(normalizeError(xhr, textStatus));
      }
    }
  });
};

/**
 * Verify a paymentToken.
 *
 * Usage:
 *
 * payswarm.paymentTokens.verify({
 *   @context: 'http://purl.org/payswarm/v1',
 *   paymentToken: paymentTokenId',
 *   data: {psaVerifyParameters [, amount] [, destination]},
 *   success: function(paymentToken) {},
 *   error: function(err) {}
 * });
 */
payswarm.paymentTokens.verify = function(options) {
  $.ajax({
    async: true,
    type: 'POST',
    url: options.paymentToken + '?action=verify',
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
        options.error(normalizeError(xhr, textStatus));
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
        options.error(normalizeError(xhr, textStatus));
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
        options.error(normalizeError(xhr, textStatus));
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
        options.error(normalizeError(xhr, textStatus));
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
      identity: options.identity,
      redirect: options.redirect || window.location.href
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
 *     listing: 'https://merchant.com/listing-url',
 *     listingHash: 'ab34e87a8d8f5fde3f23f23',
 *     source 'https://example.com/i/myid/accounts/primary',
 *     referenceId: '12345' (optional),
 *     nonce: '12345' (optional)
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
        options.error(normalizeError(xhr, textStatus));
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
 *     type: 'ps:PurchaseRequest',
 *     transactionId: 'https://example.com/transactions/1.1.a',
 *     nonce: '12345' (optional)
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
        options.error(normalizeError(xhr, textStatus));
      }
    }
  });
};

/**
 * Gets transactions before a certain creation date. Results will be
 * returned in pages. To get the next page, the last transaction from
 * the previous page and its creation date must be passed. A limit
 * can be passed for the number of transactions to return, otherwise,
 * the server maximum-permitted will be used.
 *
 * Usage:
 *
 * payswarm.transactions.get({
 *   [createdStart]: new Date('2012-03-01'),
 *   [account]: 'https://example.com/i/foo/accounts/bar',
 *   [previous]: 'https://example.com/transactions/1.1.a',
 *   [limit]: 20,
 *   success: function(transactions) {},
 *   error: function(err) {}
 * });
 */
payswarm.transactions.get = function(options) {
  var query = {};
  if(options.createdStart) {
    if(query.createdStart instanceof Date) {
      query.createdStart = (+options.createdStart / 1000);
    }
    else {
      query.createdStart = options.createdStart;
    }
  }
  if(options.account) {
    query.account = options.account;
  }
  if(options.previous) {
    query.previous = options.previous;
  }
  if(options.limit) {
    query.limit = options.limit;
  }

  $.ajax({
    async: true,
    type: 'GET',
    url: '/transactions',
    data: query,
    dataType: 'json',
    success: function(response, statusText) {
      if(options.success) {
        options.success(response);
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      if(options.error) {
        options.error(normalizeError(xhr, textStatus));
      }
    }
  });
};

// keys API
payswarm.keys = {};

/**
 * Get the keys for an identity.
 *
 * Usage:
 *
 * payswarm.keys.get({
 *   identity: 'https://example.com/i/myidentity',
 *   success: function(keys) {},
 *   error: function(err) {}
 * });
 */
payswarm.keys.get = function(options) {
  $.ajax({
    async: true,
    type: 'GET',
    url: options.identity + '/keys',
    dataType: 'json',
    success: function(response, statusText) {
      if(options.success) {
        options.success(response);
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      if(options.error) {
        options.error(normalizeError(xhr, textStatus));
      }
    }
  });
};

/**
 * Revokes a specific key for an identity.
 *
 * Usage:
 *
 * payswarm.keys.revoke({
 *   key: 'https://example.com/i/myidentity/keys/4',
 *   success: function(key) {},
 *   error: function(err) {}
 * });
 */
payswarm.keys.revoke = function(options) {
  $.ajax({
    async: true,
    type: 'POST',
    url: options.key,
    contentType: 'application/json',
    data: JSON.stringify({
      '@context': 'http://purl.org/payswarm/v1',
      revoked: ''
    }),
    dataType: 'json',
    success: function(response, statusText) {
      if(options.success) {
        options.success(response);
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      if(options.error) {
        options.error(normalizeError(xhr, textStatus));
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
 *   profile: slug or email,
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
    }, (options.ref) ? {ref: options.ref} : {})),
    success: function(response, statusText) {
      if(options.success) {
        options.success(response);
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      if(options.error) {
        options.error(normalizeError(xhr, textStatus));
      }
    }
  });
};

/**
 * Sends a password reset email to the provided and email address or
 * a profile name.
 *
 * Usage:
 *
 * payswarm.profiles.passcode({
 *   profile: {psaIdentifier: "foo@example.com"},
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
        options.error(normalizeError(xhr, textStatus));
      }
    }
  });
};

/**
 * Sets a password given an email to the provided and email address or
 * a profile name.
 *
 * Usage:
 *
 * payswarm.profiles.password({
 *   profile: {
 *     "psaIdentifier": "foo@example.com",
 *     "psaPasscode": "fhj32hfg8",
 *     "psaPasswordNew": "password12345",
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
        options.error(normalizeError(xhr, textStatus));
      }
    }
  });
};

/**
 * Normalizes an error that occurred during an XHR.
 *
 * @param xhr the XHR.
 * @param textStatus the error status as text.
 *
 * @return the normalized error.
 */
function normalizeError(xhr, textStatus) {
  try {
    var error = JSON.parse(xhr.responseText);
    if(error.type === undefined) {
      error.type = 'website.Exception';
      error.message = 'Request Error: ' + textStatus;
      // FIXME: make message user-friendly
    }
    // check for invalid session or missing session
    else if(error.type === 'payswarm.website.PermissionDenied') {
      // redirect to login
      // FIXME: support modal login to keep current state vs forced redirect
      window.location = '/profile/login?ref=' +
        encodeURIComponent(window.location.pathname);
    }
  }
  catch(e) {
    // not a json-formatted exception
    var error = {
      type: 'website.Exception',
      message: 'Request Error: ' + textStatus
      // FIXME: make message user-friendly
    };
  }
  return error;
}

})(jQuery);
