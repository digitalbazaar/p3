/*!
 * Add Payment Token Modal
 *
 * @requires jQuery v1.6+ (http://jquery.com/)
 *
 * @author Dave Longley
 */
(function($) {

var modals = window.modals = window.modals || {};

/**
 * Shows an add Payment Token modal.
 *
 * Typical usage:
 *
 * modals.addPaymentToken.show({
 *   parent: $('#parent-modal') (optional),
 *   identity: 'https://example.com/i/myidentity',
 *   paymentGateway: 'Test',
 *   added: function(paymentToken),
 *   canceled: function() {}
 * });
 */
modals.addPaymentToken = {};
modals.addPaymentToken.show = function(options) {
  // load modal
  $('#modals-add-payment-token').replaceWith(
    $.tmpl('modals-add-payment-token-tmpl', {
      tmpl: window.tmpl,
      data: window.data,
      identity: options.identity
    }));

  // set up modal
  var target = options.target = $('#modals-add-payment-token');
  $('.btn-close', target).click(function() {
    hideSelf(options);
  });
  target.on('show', function() {
    if(options.parentModal) {
      options.parentModal.modal('hide');
    }
  });

  // install address selector
  selectors.address.install({
    target: $('#add-payment-token-address-selector'),
    identity: options.identity,
    parentModal: target,
    addModal: true
  });

  // set up tool tips
  $('[rel="tooltip"]', target).tooltip();

  // handle change of payment type
  $('[name="payment-type"]', target).change(function() {
    var type = $(this).val();
    if(type === 'ccard:CreditCard') {
      $('[name="payment-type-fields"]', target).empty().append(
        $.tmpl('credit-card-tmpl', {
          tmpl: window.tmpl,
          data: window.data
        }));
    }
    else if(type === 'bank:BankAccount') {
      $('[name="payment-type-fields"]', target).empty().append(
        $.tmpl('bank-account-tmpl', {
          tmpl: window.tmpl,
          data: window.data
        }));
    }
  });

  // disable enter key
  $('#modals-add-payment-token').keypress(function(e) {
    if(e.keyCode === 13) {
      e.preventDefault();
    }
  });

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
        cardBrand: $('[name="card-brand"] option:selected', target).val(),
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

  // show modal
  target.modal({backdrop: true});
};

function hideSelf(options) {
  options.target.modal('hide');
  if(!options.paymentToken && options.canceled) {
    options.canceled();
  }
  if(options.parentModal) {
    options.parentModal.modal('show');
  }
}

})(jQuery);
