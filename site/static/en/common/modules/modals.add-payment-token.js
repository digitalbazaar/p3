/*!
 * Add Payment Token Modal
 *
 * @requires jQuery v1.6+ (http://jquery.com/)
 *
 * @author Dave Longley
 */
(function($) {

/**
 * Shows an add Payment Token modal.
 *
 * Typical usage:
 *
 * <div data-modal-add-payment-token="showExpression"
 *   data-modal-callback="callbackMethod"></div>
 */
angular.module('payswarm.directives')
.directive('modalAddPaymentToken', function(modals) {
  return {
    templateUrl: '/content/modals/add-payment-token.html',
    replace: false,
    controller: AddPaymentTokenCtrl,
    link: function(scope, element, attrs) {
      modals.watch(scope, element, attrs);
    }
  };
});

function AddPaymentTokenCtrl($scope) {
  $scope.data = window.data || {};
  $scope.identity = data.identity || {};
  $scope.paymentGateway = data.paymentGateway || 'Test';
  $scope.paymentType = 'ccard:CreditCard';
  $scope.card = {type: 'ccard:CreditCard'};
  $scope.bankAccount = {type: 'bank:BankAccount'};

  // FIXME: change to a directive
  // install address selector
  selectors.address.install({
    target: $('#add-payment-token-address-selector'),
    identity: $scope.identity,
    /*parentModal: target,*/
    addModal: true
  });

  $scope.addToken = function() {
    // create post data
    var data = {
      '@context': 'http://purl.org/payswarm/v1',
      label: $scope.label,
      paymentGateway: $scope.paymentGateway
    };

    // handle payment method specifics
    if($scope.paymentType === 'ccard:CreditCard') {
      $scope.card.cardAddress =
        $('#add-payment-token-address-selector')[0].selected;
      data.source = $scope.card;
    }
    else if($scope.paymentType === 'bank:BankAccount') {
      data.source = $scope.bankAccount;
    }

    // add payment token
    payswarm.paymentTokens.add({
      identity: $scope.identity,
      data: data,
      success: function(paymentToken) {
        modals.close(null, paymentToken);
      },
      error: function(err) {
        // FIXME: change to a directive
        var feedback = $('[name="feedback"]', target);
        website.util.processValidationErrors(feedback, target, err);
      }
    });
  };
};

})(jQuery);
