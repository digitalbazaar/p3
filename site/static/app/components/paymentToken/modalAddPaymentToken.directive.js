/*!
 * Add PaymentToken Modal.
 *
 * @author Dave Longley
 */
define(['payswarm.api'], function(payswarm) {

var deps = ['svcModal'];
return {modalAddPaymentToken: deps.concat(factory)};

function factory(svcModal) {
  function Ctrl($scope, svcPaymentToken, svcConstant) {
    $scope.selection = {
      address: null
    };

    $scope.model = {};
    $scope.data = window.data || {};
    $scope.monthLabels = svcConstant.monthLabels;
    $scope.years = svcConstant.years;
    $scope.feedback = {contactSupport: true};
    $scope.loading = false;
    $scope.identity = $scope.data.identity || {};
    $scope.editing = false;

    // common fields to all types
    $scope.paymentToken = {
      label: ''
    };
    $scope.paymentMethods =
      $scope.paymentMethods || ['CreditCard', 'BankAccount'];
    // default to first payment method
    $scope.paymentMethod = $scope.paymentMethods[0];
    $scope.card = {
      '@context': payswarm.CONTEXT_URL,
      type: 'CreditCard'
    };
    $scope.bankAccountTypes = [
      {id: 'Checking', label: 'Checking'},
      {id: 'Savings', label: 'Savings'}
    ];
    $scope.bankAccount = {
      '@context': payswarm.CONTEXT_URL,
      type: 'BankAccount',
      bankAccountType: 'Checking'
    };
    $scope.multiEnabled = ($scope.paymentMethods.length > 1);
    $scope.creditCardEnabled =
      ($scope.paymentMethods.indexOf('CreditCard') !== -1);
    $scope.bankAccountEnabled =
      ($scope.paymentMethods.indexOf('BankAccount') !== -1);

    $scope.model.agreementChecked = false;
    $scope.model.billingAddressRequired = true;
    // billing address UI depends on payment method
    $scope.$watch('scope.paymentMethod', function() {
      var isCreditCard = ($scope.paymentMethod === 'CreditCard');
      var isBankAccount = ($scope.paymentMethod === 'BankAccount');
      $scope.model.billingAddressRequired = isCreditCard || isBankAccount;
      $scope.model.agreementChecked = false;
    });

    $scope.add = function() {
      function getAddress() {
        var a = $scope.selection.address;
        return {
          type: a.type,
          label: a.label,
          fullName: a.fullName,
          streetAddress: a.streetAddress,
          locality: a.locality,
          region: a.region,
          postalCode: a.postalCode,
          countryName: a.countryName
        };
      }

      // create post data
      var token = {
        '@context': payswarm.CONTEXT_URL,
        label: $scope.paymentToken.label
      };

      // handle payment method specifics
      if($scope.paymentMethod === 'CreditCard') {
        var c = $scope.card;

        // copy required fields
        token.source = {
          '@context': c['@context'],
          type: c.type,
          cardBrand: c.cardBrand,
          cardNumber: c.cardNumber,
          cardExpMonth: c.cardExpMonth,
          cardExpYear: c.cardExpYear,
          cardCvm: c.cardCvm,
          address: getAddress()
        };
      } else if($scope.paymentMethod === 'BankAccount') {
        var b = $scope.bankAccount;

        // copy required fields
        token.source = {
          '@context': b['@context'],
          type: b.type,
          bankAccount: b.bankAccount,
          bankAccountType: b.bankAccountType,
          bankRoutingNumber: b.bankRoutingNumber,
          address: getAddress()
        };
      }

      // add payment token
      $scope.loading = true;
      svcPaymentToken.add(token, function(err, addedToken) {
        $scope.loading = false;
        if(!err) {
          $scope.modal.close(null, addedToken);
        }
        $scope.feedback.error = err;
      });
    };
  }

  return svcModal.directive({
    name: 'AddPaymentToken',
    scope: {
      paymentMethods: '='
    },
    templateUrl: '/app/templates/modals/add-payment-token.html',
    controller: ['$scope', 'svcPaymentToken', 'svcConstant', Ctrl],
    link: function(scope, element, attrs) {
      scope.feedbackTarget = element;
    }
  });
}

});
