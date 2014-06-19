/*!
 * PaySwarm Account Service.
 *
 * @author Dave Longley
 */
define(['angular'], function(angular) {

var deps = [
  '$http', '$rootScope', 'config',
  'svcIdentity', 'svcModel', 'svcPaymentToken', 'svcResource'];
return {svcAccount: deps.concat(factory)};

function factory(
  $http, $rootScope, config, svcIdentity, svcModel, svcPaymentToken, svcResource) {
  var service = {};

  // create main account collection
  var identity = svcIdentity.identity;
  service.collection = new svcResource.Collection({
    url: identity.id + '/accounts',
    finishLoading: service.updateAccounts
  });
  service.state = service.collection.state;

  // account storage mapped by identity
  service.identities = {};
  service.accounts = service.identities[identity.id] = [];

  // expose account update function
  service.updateAccounts = _updateAccounts;

  // add a credit line to an account
  service.addCreditLine = function(accountId, backupSourceId) {
    service.state.loading = true;
    return Promise.resolve($http.post(accountId + '/credit-line', {
      '@context': config.data.contextUrl,
      backupSource: backupSourceId
    })).then(function() {
      // get account
      service.collection.get(accountId);
    }).catch(function(err) {
      service.state.loading = false;
      $rootScope.$apply();
      throw err;
    });
  };

  // add a backup source to an account
  service.addBackupSource = function(accountId, backupSourceId) {
    service.state.loading = true;
    return Promise.resolve($http.post(accountId + '/backup-source', {
      '@context': config.data.contextUrl,
      backupSource: backupSourceId
    })).then(function() {
      // get account
      service.collection.get(accountId);
    }).catch(function(err) {
      service.state.loading = false;
      $rootScope.$apply();
      throw err;
    });
  };

  // delete a backup source from an account
  service.delBackupSource = function(accountId, backupSourceId) {
    service.state.loading = true;
    return Promise.resolve($http.delete(accountId, {
      backupSource: backupSourceId
    })).then(function() {
      // get account
      service.collection.get(accountId);
    }).catch(function(err) {
      service.state.loading = false;
      $rootScope.$apply();
      throw err;
    });
  };

  function _storeAccount(account) {
    var storage;
    if(!(account.owner in service.identities)) {
      storage = service.identities[account.owner] = [];
    } else {
      service.identities[account.owner];
    }
    svcModel.replaceInArray(storage, account);
  }

  function _updateAccounts() {
    angular.forEach(service.collection.storage, function(account) {
      _storeAccount(account);
      account.showExpirationWarning = false;
      account.showExpired = false;
      angular.forEach(account.backupSource, function(sourceId) {
        svcPaymentToken.find(sourceId, function(err, token) {
          if(!err && token) {
            account.showExpirationWarning =
              account.showExpirationWarning || token.showExpirationWarning;
            account.showExpired =
              account.showExpired || token.showExpired;
          }
        });
      });
    });
  }

  // expose service to scope
  $rootScope.app.services.account = service;

  return service;
}

});
