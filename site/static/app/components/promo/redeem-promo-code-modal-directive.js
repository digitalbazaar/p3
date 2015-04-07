/*!
 * Redeem Promo Code Modal.
 *
 * @author Dave Longley
 */
define([], function() {

'use strict';

/* @ngInject */
function factory(brAlertService, psPromoService) {
  return {
    restrict: 'A',
    scope: {account: '=psAccount'},
    require: '^stackable',
    templateUrl: requirejs.toUrl(
      'p3/components/promo/redeem-promo-code-modal.html'),
    link: Link
  };

  function Link(scope) {
    scope.model = {};
    scope.services = {promo: psPromoService};

    scope.redeemPromoCode = function() {
      psPromoService.redeemCode(scope.model.promoCode, scope.account.id)
        .then(function(promo) {
          scope.model.success = true;
          scope.model.promo = promo;
        })
        .catch(function(err) {
          brAlertService.add('error', err, {scope: scope});
        })
        .then(function() {
          scope.$apply();
        });
    };
  }
}

return {psRedeemPromoCodeModal: factory};

});
