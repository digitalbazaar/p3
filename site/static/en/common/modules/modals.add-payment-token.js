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
  return modals.directive({
    name: 'AddPaymentToken',
    templateUrl: '/content/modals/add-payment-token.html',
    controller: AddPaymentTokenCtrl,
  });
});

function AddPaymentTokenCtrl($scope) {
  function init() {
    $scope.data = window.data || {};
    $scope.identity = data.identity || {};
    $scope.paymentGateway = data.paymentGateway || 'Test';
    $scope.paymentType = 'ccard:CreditCard';
    $scope.label = '';
    $scope.card = {type: 'ccard:CreditCard'};
    $scope.bankAccount = {type: 'bank:BankAccount'};
    $scope.monthNumbers = window.tmpl.monthNumbers;
    $scope.years = window.tmpl.years;
  };
  init();

  $scope.addToken = function() {
    // create post data
    var data = {
      '@context': 'http://purl.org/payswarm/v1',
      label: $scope.label,
      paymentGateway: $scope.paymentGateway
    };

    // handle payment method specifics
    if($scope.paymentType === 'ccard:CreditCard') {
      data.source = $scope.card;
    }
    else if($scope.paymentType === 'bank:BankAccount') {
      data.source = $scope.bankAccount;
    }

    // FIXME: disabled temporarily
    $scope.close(null, null);
    init();
    return;

    // add payment token
    payswarm.paymentTokens.add({
      identity: $scope.identity,
      data: data,
      success: function(paymentToken) {
        $scope.close(null, paymentToken);
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
