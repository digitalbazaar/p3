/*!
 * Redeem Promo Code Modal.
 *
 * @author Dave Longley
 */
define([], function() {

var deps = ['ModalService', 'svcPromo'];
return {redeemPromoCodeModal: deps.concat(factory)};

function factory(ModalService, svcPromo) {
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

  return ModalService.directive({
    name: 'redeemPromoCode',
    scope: {
      account: '='
    },
    templateUrl: '/app/components/promo/redeem-promo-code-modal.html',
    controller: ['$scope', Ctrl],
    link: Link
  });
}

});
