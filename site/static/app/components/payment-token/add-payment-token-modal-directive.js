/*!
 * Add PaymentToken Modal.
 *
 * @author Dave Longley
 */
define([], function() {

'use strict';

/* @ngInject */
function factory(AlertService, IdentityService, PaymentTokenService, config) {
  return {
    scope: {paymentMethods: '='},
    require: '^stackable',
    templateUrl: '/app/components/payment-token/add-payment-token-modal.html',
    link: Link
  };

  function Link(scope) {
    scope.model = {};
    scope.selection = {
      address: null
    };
    scope.monthLabels = config.constants.monthLabels;
    scope.years = config.constants.years;
    scope.feedback = {contactSupport: true};
    scope.loading = false;
    scope.identity = IdentityService.identity;
    scope.editing = false;

    // common fields to all types
    scope.paymentToken = {
      label: ''
    };
    scope.paymentMethods =
      scope.paymentMethods || ['CreditCard', 'BankAccount'];
    // default to first payment method
    scope.paymentMethod = scope.paymentMethods[0];
    scope.card = {
      '@context': config.data.contextUrl,
      type: 'CreditCard'
    };
    scope.bankAccountTypes = [
      {id: 'Checking', label: 'Checking'},
      {id: 'Savings', label: 'Savings'}
    ];
    scope.bankAccount = {
      '@context': config.data.contextUrl,
      type: 'BankAccount',
      bankAccountType: 'Checking'
    };
    scope.multiEnabled = (scope.paymentMethods.length > 1);
    scope.creditCardEnabled =
      (scope.paymentMethods.indexOf('CreditCard') !== -1);
    scope.bankAccountEnabled =
      (scope.paymentMethods.indexOf('BankAccount') !== -1);

    scope.model.agreementChecked = false;
    scope.model.billingAddressRequired = true;
    // billing address UI depends on payment method
    scope.$watch('scope.paymentMethod', function() {
      var isCreditCard = (scope.paymentMethod === 'CreditCard');
      var isBankAccount = (scope.paymentMethod === 'BankAccount');
      scope.model.billingAddressRequired = isCreditCard || isBankAccount;
      scope.model.agreementChecked = false;
    });

    scope.add = function() {
      function getAddress() {
        var a = scope.selection.address;
        return {
          type: a.type,
          label: a.label,
          name: a.name,
          streetAddress: a.streetAddress,
          addressLocality: a.addressLocality,
          addressRegion: a.addressRegion,
          postalCode: a.postalCode,
          addressCountry: a.addressCountry
        };
      }

      // create post data
      var token = {
        '@context': config.data.contextUrl,
        label: scope.paymentToken.label
      };

      // handle payment method specifics
      if(scope.paymentMethod === 'CreditCard') {
        var c = scope.card;

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
      } else if(scope.paymentMethod === 'BankAccount') {
        var b = scope.bankAccount;

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
      scope.loading = true;
      AlertService.clearFeedback();
      PaymentTokenService.collection.add(token).then(function(addedToken) {
        scope.loading = false;
        scope.modal.close(null, addedToken);
      }).catch(function(err) {
        AlertService.add('error', err);
        scope.loading = false;
        scope.$apply();
      });
    };
  }
}

return {addPaymentTokenModal: factory};

});
