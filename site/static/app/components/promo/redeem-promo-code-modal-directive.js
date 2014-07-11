/*!
 * Redeem Promo Code Modal.
 *
 * @author Dave Longley
 */
define([], function() {

/* @ngInject */
function factory(AlertService, ModalService, PromoService) {
  return ModalService.directive({
    name: 'redeemPromoCode',
    scope: {account: '='},
    templateUrl: '/app/components/promo/redeem-promo-code-modal.html',
    link: Link
  });

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
          AlertService.add('error', err);
        })
        .then(function() {
          scope.$apply();
        });
    };
  }
}

return {redeemPromoCodeModal: factory};

});
