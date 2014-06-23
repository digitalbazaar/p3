/*!
 * PaySwarm Promo Service.
 *
 * @author Dave Longley
 */
define(['angular'], function(angular) {

var deps = ['$rootScope', 'svcAccount', 'svcTransaction'];
return {svcPromo: deps.concat(factory)};

function factory($rootScope, svcAccount, svcTransaction) {
  var service = {};

  service.state = {
    loading: false
  };

  // redeem a promo code
  service.redeemCode = function(code, account, callback) {
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.promos.redeemCode({
      promoCode: code,
      account: account,
      success: function(promo) {
        service.state.loading = false;
        // refresh related account
        svcAccount.getOne(account, function(err) {
          callback(err, promo);
          // refresh latest transactions
          svcTransaction.getRecent({force: true});
        });
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
