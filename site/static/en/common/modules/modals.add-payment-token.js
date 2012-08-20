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
    templateUrl: '/content/add-payment-token.html',
    replace: false,
    controller: AddPaymentTokenCtrl,
    link: function(scope, element, attrs) {
      // open modal when expression is true
      scope.$watch(attrs.modalAddPaymentToken, function(value) {
        if(value) {
          modals.open(scope, element, attrs.modalCallback);
        }
      });
    }
  };
});

function AddPaymentTokenCtrl($scope) {
  $scope.data = window.data || {};
  $scope.identity = data.identity || {};
  $scope.paymentGateway = data.paymentGateway || 'Test';
  $scope.card = {};
  $scope.bankAccount = {};

  // FIXME: change to a directive
  // install address selector
  selectors.address.install({
    target: $('#add-payment-token-address-selector'),
    identity: options.identity,
    parentModal: target,
    addModal: true
  });

  // FIXME: change to a directive
  // set up tool tips
  $('[rel="tooltip"]', target).tooltip();

  // FIXME: change to a directive
  // auto-select card type based on input
  $('[name="card-number"]', target).bind('input', function() {
    selectCardType(target, $(this).val());
  });

  // FIXME: handle via angular in template ... ensure card type
  // selection is rebound/handled via directive
  // handle change of payment type
  $('[name="payment-type"]', target).change(function() {
    var type = $(this).val();
    if(type === 'ccard:CreditCard') {
      $('[name="payment-type-fields"]', target).empty().append(
        $.tmpl('credit-card-tmpl', {
          tmpl: window.tmpl,
          data: window.data
        }));
      // auto-select card type based on input
      $('[name="card-number"]', target).bind('input', function() {
        selectCardType(target, $(this).val());
      });
    }
    else if(type === 'bank:BankAccount') {
      $('[name="payment-type-fields"]', target).empty().append(
        $.tmpl('bank-account-tmpl', {
          tmpl: window.tmpl,
          data: window.data
        }));
    }
  });

  // FIXME: fix this...
  // disable enter key
  $('#modals-add-payment-token').keypress(function(e) {
    if(e.keyCode === 13) {
      e.preventDefault();
    }
  });

  // FIXME: continue from here

  // add button clicked
  $('[name="button-add-payment-token"]', target).click(function() {
    // create post data
    var data = {
      '@context': 'http://purl.org/payswarm/v1',
      label: $('[name="label"]', target).val(),
      paymentGateway: options.paymentGateway || window.data.paymentGateway
    };

    // handle payment method specifics
    var paymentType = $('[name="payment-type"]:checked', target).val();
    if(paymentType === 'ccard:CreditCard') {
      data.source = {
        type: paymentType,
        cardBrand: $('[name="card-brand"]', target).attr('data-card-brand'),
        cardNumber: $('[name="card-number"]', target).val(),
        cardExpMonth:
          $('[name="card-exp-month"] option:selected', target).val(),
        cardExpYear:
          $('[name="card-exp-year"] option:selected', target).val().substr(2),
        cardCvm: $('[name="card-cvm"]', target).val(),
        cardAddress: $('#add-payment-token-address-selector')[0].selected
      };
    }
    else if(paymentType === 'bank:BankAccount') {
      data.source = {
        type: paymentType,
        bankAccount: $('[name="bank-account"]', target).val(),
        bankRoutingNumber: $('[name="bank-routing-number"]', target).val()
      };
    }

    // add payment token
    payswarm.paymentTokens.add({
      identity: options.identity,
      data: data,
      success: function(paymentToken) {
        options.paymentToken = paymentToken;
        hideSelf(options);
        if(options.added) {
          options.added(paymentToken);
        }
      },
      error: function(err) {
        var feedback = $('[name="feedback"]', target);
        website.util.processValidationErrors(feedback, target, err);
      }
    });
  });
};

})(jQuery);
