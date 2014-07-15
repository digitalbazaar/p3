/*!
 * PaySwarm Transaction Service.
 *
 * @author Dave Longley
 */
define(['angular'], function(angular) {

'use strict';

/* @ngInject */
function factory(
  $http, $rootScope, ModelService, RefreshService, ResourceService) {
  var service = {};

  service.createTxnsCollection = function(options) {
    options = options || {};
    options.url = options.url || '/transactions';
    return new ResourceService.Collection(options);
  };

  // create main transaction collection
  service.collection = service.createTxnsCollection();

  // create recent transactions collection
  service.accounts = {};
  service.recentCollection = service.createTxnsCollection({
    query: {
      limit: 10
    },
    finishLoading: _updateRecent
  });
  service.recentTxns = service.recentCollection.storage;
  service.state = {
    transactions: service.collection.state,
    recent: service.recentCollection.state
  };

  /**
   * Gets the transactions for an identity.
   *
   * Gets transactions before a certain creation date. Results will be
   * returned in pages. To get the next page, the last transaction from
   * the previous page and its creation date must be passed. A limit
   * can be passed for the number of transactions to return, otherwise,
   * the server maximum-permitted will be used.
   *
   * @param options the options to use:
   *   [collection]: collection object (default: main collection)
   *   [createdStart]: new Date('2012-03-01'),
   *   [account]: 'https://example.com/i/foo/accounts/bar',
   *   [previous]: 'https://example.com/transactions/1.1.a',
   *   [limit]: 20,
   */
  service.query = function(options) {
    // TODO: eliminate this call and just use .getAll()?
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
    var collection = options.collection || service.collection;
    return collection.getAll({params: query}).then(function() {
      // update account info if account specified and using main collection
      if(options.account && options.collection === service.collection) {
        _updateAccount(options.account, service.collection.storage);
      }
    });
  };

  // get all recent transactions for an identity
  service.getRecent = function(options) {
    return service.recentCollection.getAll(options);
  };

  // requests that a deposit be signed
  service.signDeposit = function(deposit) {
    return _postTransaction(deposit);
  };

  // confirms a signed deposit, submitting it for processing
  service.confirmDeposit = function(deposit) {
    return _postTransaction(deposit);
  };

  // requests that a withdrawal be signed
  service.signWithdrawal = function(withdrawal) {
    return _postTransaction(withdrawal);
  };

  // confirms a signed withdrawal, submitting it for processing
  service.confirmWithdrawal = function(withdrawal) {
    return _postTransaction(withdrawal);
  };

  /**
   * Gets a quote (a Contract) for a purchase.
   *
   * Usage:
   *
   * TransactionService.getQuote({
   *   listing: 'https://merchant.com/listing-url',
   *   listingHash: 'ab34e87a8d8f5fde3f23f23',
   *   source 'https://example.com/i/myid/accounts/primary',
   *   referenceId: '12345' (optional),
   *   nonce: '12345' (optional)
   * });
   */
  service.getQuote = function(purchaseRequest) {
    return Promise.resolve($http.post('/transactions', purchaseRequest, {
      params: {quote: 'true'}
    }).then(function(response) {
      return response.data;
    }));
  };

  /**
   * Performs a purchase.
   *
   * Usage:
   *
   * TransactionService.purchase({
   *   type: 'PurchaseRequest',
   *   transactionId: 'https://example.com/transactions/1.1.a',
   *   nonce: '12345' (optional)
   * });
   */
  service.purchase = function(purchaseRequest) {
    return _postTransaction(purchaseRequest);
  };

  function _postTransaction(txn) {
    return Promise.resolve($http.post('/transactions', txn)
      .then(function(response) {
        return response.data;
      }));
  }

  // get string for type of transaction
  service.getType = function(txn) {
    if(txn.type.indexOf('Deposit') !== -1) {
      return 'deposit';
    } else if(txn.type.indexOf('Contract') !== -1) {
      return 'contract';
    } else if(txn.type.indexOf('Transfer') !== -1) {
      return 'transfer';
    } else if(txn.type.indexOf('Withdrawal') !== -1) {
      return 'withdrawal';
    } else {
      return 'error';
    }
  };

  function _updateAccount(account, txns) {
    if(!(account in service.accounts)) {
      service.accounts[account] = [];
    }
    ModelService.replaceArray(service.accounts[account], txns);
  }

  function _updateRecent() {
    var recent = [];
    var txns = service.recentTxns;
    angular.forEach(txns, function(txn) {
      // skip txns w/insufficent funds
      if(!(txn.voided &&
        txn.voidReason === 'payswarm.financial.InsufficientFunds')) {
        recent.push(txn);
      }
    });
    ModelService.replaceArray(service.recentTxns, recent);
  }

  // register for system-wide refreshes
  RefreshService.register(service.recentCollection);

  // expose service to scope
  $rootScope.app.services.transaction = service;

  return service;
}

return {TransactionService: factory};

});
