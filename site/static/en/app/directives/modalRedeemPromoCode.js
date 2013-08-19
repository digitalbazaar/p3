/*!
 * Redeem Promo Code Modal.
 *
 * @author Dave Longley
 */
(function() {

define([], function() {

var name = 'modalRedeemPromoCode';
var deps = ['svcModal', 'svcPromo'];
var factory = function(svcModal, svcPromo) {
  function Ctrl($scope) {
    $scope.model = {};
    $scope.data = window.data || {};
    $scope.feedback = {};
    $scope.services = {promo: svcPromo};

    $scope.redeemPromoCode = function() {
      svcPromo.redeemCode(
        $scope.model.promoCode, $scope.account.id, function(err, promo) {
        $scope.feedback.error = err;
        if(err) {
          return;
        }
        $scope.model.success = true;
        $scope.model.promo = promo;
      });
    };
  }

  function Link(scope, element, attrs) {
    scope.feedbackTarget = element;
  }

  return svcModal.directive({
    name: 'RedeemPromoCode',
    scope: {
      account: '='
    },
    templateUrl: '/partials/modals/redeem-promo-code.html',
    controller: Ctrl,
    link: Link
  });
};

return {name: name, deps: deps, factory: factory};
});

})();
