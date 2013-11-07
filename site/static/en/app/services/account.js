/*!
 * PaySwarm Account Service.
 *
 * @author Dave Longley
 */
define(['angular', 'jquery', 'payswarm.api'], function(angular, $, payswarm) {

var deps = ['$timeout', '$rootScope', 'svcModel', 'svcIdentity'];
return {svcAccount: deps.concat(factory)};

function factory($timeout, $rootScope, svcModel, svcIdentity) {
  var service = {};

  function _entry(identityId) {
    if(!(identityId in service.identities)) {
      service.identities[identityId] = {
        accounts: [],
        expires: 0
      };
    }
    return service.identities[identityId];
  }

  var identity = svcIdentity.identity;
  var maxAge = 1000*60*2;
  service.identities = {};
  service.accounts = _entry(identity.id).accounts;
  service.state = {
    loading: false
  };

  // get all accounts for an identity
  service.get = function(options, callback) {
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || angular.noop;
    var identityId = options.identity || identity.id;

    var entry = _entry(identityId);
    if(options.force || +new Date() >= entry.expires) {
      service.state.loading = true;
      $timeout(function() {
        payswarm.accounts.get({
          identity: identityId,
          success: function(accounts) {
            svcModel.replaceArray(entry.accounts, accounts);
            entry.expires = +new Date() + maxAge;
            service.state.loading = false;
            callback(null, entry.accounts);
            $rootScope.$apply();
          },
          error: function(err) {
            service.state.loading = false;
            callback(err);
            $rootScope.$apply();
          }
        });
      }, options.delay || 0);
    }
    else {
      $timeout(function() {
        callback(null, entry.accounts);
      });
    }
  };

  // get a single account
  service.getOne = function(accountId, options, callback) {
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || angular.noop;

    service.state.loading = true;
    $timeout(function() {
      payswarm.accounts.getOne({
        account: accountId,
        success: function(account) {
          var entry = _entry(account.owner);
          svcModel.replaceInArray(entry.accounts, account);
          service.state.loading = false;
          callback(null, account);
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

  // add a new account
  service.add = function(account, identityId, callback) {
    if(typeof identityId === 'function') {
      callback = identityId;
      identityId = identity.id;
    }
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.accounts.add({
      identity: identityId,
      account: account,
      success: function(account) {
        var entry = _entry(identityId);
        entry.accounts.push(account);
        service.state.loading = false;
        callback(null, account);
        $rootScope.$apply();
        // update account to get latest balance
        // FIXME: in future, use real-time events
        service.getOne(account.id, {delay: 500});
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
        $rootScope.$apply();
      }
    });
  };

  // update an account
  service.update = function(account, callback) {
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.accounts.update({
      identity: identity.id,
      account: account,
      success: function() {
        // get account
        service.getOne(account.id, callback);
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
        $rootScope.$apply();
      }
    });
  };

  // add a credit line to an account
  service.addCreditLine = function(accountId, backupSourceId, callback) {
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.accounts.addCreditLine({
      account: accountId,
      backupSource: backupSourceId,
      success: function() {
        // get account
        service.getOne(accountId, callback);
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
        $rootScope.$apply();
      }
    });
  };

  // add a backup source to an account
  service.addBackupSource = function(accountId, backupSourceId, callback) {
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.accounts.addBackupSource({
      account: accountId,
      backupSource: backupSourceId,
      success: function() {
        // get account
        service.getOne(accountId, callback);
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
        $rootScope.$apply();
      }
    });
  };

  // delete a backup source from an account
  service.delBackupSource = function(accountId, backupSourceId, callback) {
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.accounts.delBackupSource({
      account: accountId,
      backupSource: backupSourceId,
      success: function() {
        // get account
        service.getOne(accountId, callback);
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
        $rootScope.$apply();
      }
    });
  };

  return service;
}

});
