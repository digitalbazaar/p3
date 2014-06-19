/*!
 * PaySwarm Transaction Service.
 *
 * @author Dave Longley
 */
define(['angular'], function(angular) {

var deps = ['$timeout', '$rootScope', 'svcModel', 'svcIdentity'];
return {svcTransaction: deps.concat(factory)};

function factory($timeout, $rootScope, svcModel, svcIdentity) {
  var service = {};

  var identity = svcIdentity.identity;
  var expires = 0;
  var maxAge = 1000*60*2;
  service.recentTxns = [];
  service.accounts = {};
  service.state = {
    loading: false
  };

  /**
   * Gets the transactions for an identity.
   *
   * @param options the options to use:
   *          [delay] a timeout to wait before fetching transactions.
   *          [createdStart] the creation start date.
   *          [account] the account.
   *          [previous] the previous transaction (for pagination).
   *          [limit] the maximum number of transactions to get.
   */
  service.get = function(options, callback) {
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || angular.noop;

    service.state.loading = true;
    $timeout(function() {
      payswarm.transactions.get({
        identity: identity.id,
        createdStart: options.createdStart || undefined,
        account: options.account || undefined,
        previous: options.previous || undefined,
        limit: options.limit || undefined,
        success: function(txns) {
          var account = options.account || null;
          if(!(account in service.accounts)) {
            service.accounts[account] = [];
          }
          svcModel.replaceArray(service.accounts[account], txns);
          expires = +new Date() + maxAge;
          service.state.loading = false;
          callback(null, txns);
          $rootScope.$apply();
        },
        error: function(err) {
          service.state.loading = false;
          callback(err);
          $rootScope.$apply();
        }
      });
    }, options.delay || 0);
  };

  // get all recent transactions for an identity
  service.getRecent = function(options, callback) {
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || angular.noop;

    if(options.force || +new Date() >= expires) {
      service.state.loading = true;
      $timeout(function() {
        payswarm.transactions.get({
          // FIXME: make date ordering explicit
          identity: identity.id,
          limit: 10,
          success: function(txns) {
            var recent = [];
            angular.forEach(txns, function(txn) {
              // skip txns w/insufficent funds
              if(!(txn.voided &&
                txn.voidReason === 'payswarm.financial.InsufficientFunds')) {
                recent.push(txn);
              }
            });
            svcModel.replaceArray(service.recentTxns, recent);
            expires = +new Date() + maxAge;
            service.state.loading = false;
            callback(null, service.recentTxns);
            $rootScope.$apply();
          },
          error: function(err) {
            service.state.loading = false;
            callback(err);
            $rootScope.$apply();
          }
        });
      }, options.delay || 0);
    } else {
      $timeout(function() {
        callback(null, service.recentTxns);
      });
    }
  };

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

  return service;
}

});
