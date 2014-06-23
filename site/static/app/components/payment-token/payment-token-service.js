/*!
 * PaySwarm PaymentToken Service.
 *
 * @author Dave Longley
 */
define(['angular'], function(angular) {

var deps = [
  '$http', '$rootScope', 'svcIdentity', 'svcModel', 'svcResource'];
return {svcPaymentToken: deps.concat(factory)};

function factory(
  $http, $rootScope, svcIdentity, svcModel, svcResource) {
  var service = {};

  // create main payment token collection
  var identity = svcIdentity.identity;
  service.collection = new svcResource.Collection({
    url: identity.id + '/payment-tokens',
    finishLoading: _updateTokens
  });
  service.state = service.collection.state;

  // all tokens
  service.paymentTokens = service.collection.storage;
  // active tokens
  service.active = [];
  // deleted tokens
  service.deleted = [];
  // type specific tokens
  service.creditCards = [];
  service.bankAccounts = [];
  // class specific tokens
  // 'instant' tokens can be used in cases where a transfer of funds must take
  // place immediately.
  service.instant = [];
  // non-instant
  service.nonInstant = [];

  service.paymentMethods = ['CreditCard', 'BankAccount'];
  service.nonInstantPaymentMethods = ['BankAccount'];
  service.instantPaymentMethods = ['CreditCard'];

  // restores a deleted but unexpired paymentToken
  service.restore = function(tokenId) {
    service.state.loading = true;
    return Promise.resolve($http.post(tokenId, {
      action: 'restore'
    })).then(function() {
      // get payment token
      return service.collection.get(tokenId);
    }).catch(function(err) {
      service.state.loading = false;
      $rootScope.$apply();
      throw err;
    });
  };

  // verify a token
  service.verify = function(tokenId, verifyRequest) {
    service.state.loading = true;
    return Promise.resolve($http.post(tokenId, verifyRequest, {
      action: 'verify'
    })).then(function() {
      // get payment token
      return service.collection.get(tokenId);
    }).catch(function(err) {
      service.state.loading = false;
      $rootScope.$apply();
      throw err;
    });
  };

  // find a currently loaded token by id
  // returns null if not found
  service.find = function(paymentTokenId) {
    var result = null;
    for(var i = 0; i < service.paymentTokens.length; ++i) {
      var token = service.paymentTokens[i];
      if(token.id === paymentTokenId) {
        result = token;
        break;
      }
    }
    return result;
  };

  function _updateTokens() {
    // filter types of tokens
    var active = [];
    var deleted = [];
    var creditCards = [];
    var bankAccounts = [];
    var instant = [];
    var nonInstant = [];
    angular.forEach(service.paymentTokens, function(token) {
      if(token.sysStatus === 'active') {
        active.push(token);
      } else if(!token.sysStatus || token.sysStatus === 'deleted') {
        deleted.push(token);
      }

      if(token.paymentMethod === 'CreditCard') {
        creditCards.push(token);

        // add computed properties for expiration notifications
        var expires = new Date(token.cardExpYear, token.cardExpMonth);
        var hour = 60 * 60 * 1000;
        var month = 30 * 24 * hour;
        // find time to live
        // offset notifications by an hour
        var ttl = expires - (new Date()) - hour;
        // show warning a month early
        token.showExpirationWarning = (ttl > 0 && ttl <= month);
        token.showExpired = (ttl <= 0);
      } else if(token.paymentMethod === 'BankAccount') {
        bankAccounts.push(token);
      }

      if(token.sysStatus === 'active') {
        if(service.instantPaymentMethods.indexOf(token.paymentMethod) !== -1) {
          instant.push(token);
        }
        if(service.nonInstantPaymentMethods.indexOf(
          token.paymentMethod) !== -1) {
          nonInstant.push(token);
        }
      }
    });
    svcModel.replaceArray(service.active, active);
    svcModel.replaceArray(service.deleted, deleted);
    svcModel.replaceArray(service.creditCards, creditCards);
    svcModel.replaceArray(service.bankAccounts, bankAccounts);
    svcModel.replaceArray(service.instant, instant);
    svcModel.replaceArray(service.nonInstant, nonInstant);
  }

  // expose service to scope
  $rootScope.app.services.paymentToken = service;

  return service;
}

});
