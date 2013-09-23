/*!
 * PaySwarm PaymentToken Service.
 *
 * @author Dave Longley
 */
define(['angular', 'payswarm.api'], function(angular, payswarm) {

var deps = ['$timeout', '$rootScope', 'svcModel', 'svcIdentity'];
return {svcPaymentToken: deps.concat(factory)};

function factory($timeout, $rootScope, svcModel, svcIdentity) {
  var service = {};

  var identity = svcIdentity.identity;
  var expires = 0;
  var maxAge = 1000*60*2;
  service.state = {
    loading: false
  };
  // all tokens
  service.paymentTokens = [];
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

  function _updateTokens(paymentTokens) {
    if(paymentTokens) {
      // update tokens
      svcModel.replaceArray(service.paymentTokens, paymentTokens);
    }

    // filter types of tokens
    var active = [];
    var deleted = [];
    var creditCards = [];
    var bankAccounts = [];
    var instant = [];
    var nonInstant = [];
    angular.forEach(service.paymentTokens, function(token) {
      if(token.psaStatus === 'active') {
        active.push(token);
      }
      else if(!token.psaStatus || token.psaStatus === 'deleted') {
        deleted.push(token);
      }

      if(token.paymentMethod === 'CreditCard') {
        creditCards.push(token);
      }
      else if(token.paymentMethod === 'BankAccount') {
        bankAccounts.push(token);
      }

      if(token.psaStatus === 'active') {
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

  // get all paymentTokens for an identity
  service.get = function(options, callback) {
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || angular.noop;

    if(options.force || +new Date() >= expires) {
      service.state.loading = true;
      $timeout(function() {
        payswarm.paymentTokens.get({
          identity: identity.id,
          success: function(paymentTokens) {
            _updateTokens(paymentTokens);
            expires = +new Date() + maxAge;
            service.state.loading = false;
            callback(null, service.paymentTokens);
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
        callback(null, service.paymentTokens);
      });
    }
  };

  // get a single paymentToken
  service.getOne = function(paymentTokenId, options, callback) {
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || angular.noop;

    service.state.loading = true;
    $timeout(function() {
      payswarm.paymentTokens.getOne({
        paymentToken: paymentTokenId,
        success: function(paymentToken) {
          svcModel.replaceInArray(service.paymentTokens, paymentToken);
          _updateTokens();
          service.state.loading = false;
          callback(null, paymentToken);
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

  // add a new paymentToken
  service.add = function(paymentToken, callback) {
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.paymentTokens.add({
      identity: identity.id,
      data: paymentToken,
      success: function(paymentToken) {
        svcModel.replaceInArray(service.paymentTokens, paymentToken);
        _updateTokens();
        service.state.loading = false;
        callback(null, paymentToken);
        $rootScope.$apply();
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
        $rootScope.$apply();
      }
    });
  };

  // update a paymentToken
  /*
  service.update = function(paymentToken, callback) {
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.paymentTokens.update({
      identity: identity.id,
      data: paymentToken,
      success: function(paymentToken) {
        svcModel.replaceInArray(service.paymentTokens, paymentToken);
        _updateTokens();
        service.state.loading = false;
        callback(null, paymentToken);
        $rootScope.$apply();
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
        $rootScope.$apply();
      }
    });
  };
  */

  // deletes a paymentToken
  service.del = function(paymentTokenId, callback) {
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.paymentTokens.del({
      paymentToken: paymentTokenId,
      success: function(data) {
        if(!data) {
          svcModel.removeFromArray(paymentTokenId, service.paymentTokens);
        }
        else {
          svcModel.replaceInArray(service.paymentTokens, data);
        }
        _updateTokens();
        service.state.loading = false;
        callback();
        $rootScope.$apply();
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
        $rootScope.$apply();
      }
    });
  };

  // restores a deleted but unexpired paymentToken
  service.restore = function(paymentTokenId, callback) {
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.paymentTokens.restore({
      paymentToken: paymentTokenId,
      success: function(token) {
        svcModel.replaceInArray(service.paymentTokens, token);
        _updateTokens();
        service.state.loading = false;
        callback();
        $rootScope.$apply();
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
        $rootScope.$apply();
      }
    });
  };

  // verify a token
  service.verify = function(paymentTokenId, verifyRequest, callback) {
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.paymentTokens.verify({
      paymentToken: paymentTokenId,
      data: verifyRequest,
      success: function(paymentToken) {
        svcModel.replaceInArray(service.paymentTokens, paymentToken);
        _updateTokens();
        service.state.loading = false;
        callback(null, paymentToken);
        $rootScope.$apply();
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