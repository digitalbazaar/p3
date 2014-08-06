/*!
 * Redeem Promo Code Modal.
 *
 * @author Dave Longley
 */
define([], function() {

'use strict';

/* @ngInject */
function factory(AlertService, PromoService) {
  return {
    scope: {account: '='},
    require: '^stackable',
    templateUrl: '/app/components/promo/redeem-promo-code-modal.html',
    link: Link
  };

  function Link(scope) {
    scope.model = {};
    scope.services = {promo: PromoService};

    scope.redeemPromoCode = function() {
      PromoService.redeemCode(scope.model.promoCode, scope.account.id)
        .then(function(promo) {
          scope.model.success = true;
          scope.model.promo = promo;
        })
        .catch(function(err) {
          AlertService.add('error', err, {scope: scope});
        })
        .then(function() {
          scope.$apply();
        });
    };
  }
}

return {redeemPromoCodeModal: factory};

});
