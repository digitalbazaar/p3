/*!
 * PaySwarm Promo Service.
 *
 * @author Dave Longley
 */
define([], function() {

'use strict'; 

/* @ngInject */
function factory(
  $http, $rootScope, AccountService, TransactionService, config) {
  var service = {};

  service.state = {
    loading: false
  };

  // redeem a promo code
  service.redeemCode = function(code, accountId) {
    service.state.loading = true;
    return Promise.resolve($http.post('/promos?action=redeem', {
      promoCode: code,
      account: accountId
    })).then(function() {
      service.state.loading = false;
      // refresh related account
      AccountService.collection.get(accountId).then(function(account) {
        // refresh latest transactions
        TransactionService.getRecent({force: true});
      });
    }).catch(function(err) {
      service.state.loading = false;
      throw err;
    });
  };

  // expose service to scope
  $rootScope.app.services.promo = service;

  return service;
}

return {PromoService: factory};

});
