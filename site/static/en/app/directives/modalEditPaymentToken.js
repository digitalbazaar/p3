/*!
 * Edit PaymentToken Modal.
 *
 * @author Digital Bazaar
 */
define(['angular', 'payswarm.api'], function(angular, payswarm) {

var deps = ['svcModal'];
return {modalEditPaymentToken: deps.concat(factory)};

function factory(svcModal) {
  function Ctrl($scope, svcPaymentToken, svcConstant) {
    $scope.model = {};
    $scope.data = window.data || {};
    $scope.monthLabels = svcConstant.monthLabels;
    $scope.years = svcConstant.years;
    $scope.feedback = {contactSupport: true};
    $scope.loading = false;
    $scope.identity = $scope.data.identity || {};
    $scope.editing = true;

    // copy for editing
    $scope.paymentToken = angular.copy($scope.sourcePaymentToken);
    // aliases
    $scope.card = $scope.paymentToken;
    $scope.bankAccount = $scope.paymentToken;

    // setup environment based on token being edited
    $scope.multiEnabled = false;

    if($scope.paymentToken.paymentMethod === 'CreditCard') {
      $scope.creditCardEnabled = true;
      $scope.paymentMethod = 'CreditCard';
    }
    if($scope.paymentToken.paymentMethod === 'BankAccount') {
      $scope.bankAccountEnabled = true;
      $scope.paymentMethod = 'BankAccount';
    }

    // must have been agreed to before
    $scope.agreementChecked = true;
    $scope.billingAddressRequired = true;
    // billing address UI depends on payment method
    $scope.$watch('scope.paymentMethod', function() {
      var isCreditCard = ($scope.paymentMethod === 'CreditCard');
      var isBankAccount = ($scope.paymentMethod === 'BankAccount');
      $scope.billingAddressRequired = isCreditCard || isBankAccount;
    });

    $scope.editPaymentToken = function() {
      var paymentToken = {
        '@context': payswarm.CONTEXT_URL,
        id: $scope.paymentToken.id,
        label: $scope.paymentToken.label
      };

      $scope.loading = true;
      svcPaymentToken.update(paymentToken, function(err, paymentToken) {
        $scope.loading = false;
        if(!err) {
          $scope.modal.close(null, paymentToken);
        }
        $scope.feedback.error = err;
      });
    };
  }

  return svcModal.directive({
    name: 'EditPaymentToken',
    scope: {
      paymentMethods: '=',
      sourcePaymentToken: '=paymentToken'
    },
    templateUrl: '/partials/modals/edit-payment-token.html',
    controller: ['$scope', 'svcPaymentToken', 'svcConstant', Ctrl],
    link: function(scope, element, attrs) {
      scope.feedbackTarget = element;
    }
  });
}

});
