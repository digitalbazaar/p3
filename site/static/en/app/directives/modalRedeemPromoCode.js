/*!
 * Redeem Promo Code Modal.
 *
 * @author Dave Longley
 */
define([], function() {

var deps = ['svcModal', 'svcPromo'];
return {modalRedeemPromoCode: deps.concat(factory)};

function factory(svcModal, svcPromo) {
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
    templateUrl: '/app/templates/modals/redeem-promo-code.html',
    controller: ['$scope', Ctrl],
    link: Link
  });
}

});
