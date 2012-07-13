/*!
 * Deposit Modal
 *
 * @requires jQuery v1.6+ (http://jquery.com/)
 *
 * @author Dave Longley
 */
(function($) {

var modals = window.modals = window.modals || {};

/**
 * Shows a Deposit modal.
 *
 * Typical usage:
 *
 * modals.deposit.show({
 *   parent: $('#parent-modal') (optional),
 *   identity: 'https://example.com/i/myidentity',
 *   account: 'https://example.com/i/myidentity/accounts/primary',
 *   deposited: function(deposit) {},
 *   error: function(err) {},
 *   canceled: function() {}
 * });
 */
modals.deposit = {};
modals.deposit.show = function(options) {
  // load modal
  $('#modals-deposit').replaceWith($.tmpl('modals-deposit-tmpl', {
    tmpl: window.tmpl,
    data: window.data,
    account: options.account
  }));

  // set up modal
  var target = options.target = $('#modals-deposit');
  target.on('show', function() {
    if(options.parentModal) {
      options.parentModal.modal('hide');
    }
  });

  // set up review page
  setupReviewPage(options);

  // show modal
  target.modal({backdrop: true});
};

function setupReviewPage(options) {
  // go to top of page
  var target = options.target;
  $(target).animate({scrollTop: 0}, 0);

  // bind close button
  $('.btn-close', target).click(function() {
    hideSelf(options);
  });

  // get identity's addresses
  payswarm.addresses.get({
    identity: options.identity,
    success: function(addresses) {
      if(addresses.length === 0) {
        // show add address modal if no addresses are set
        window.modals.addAddress.show({
          identity: options.identity,
          showAlert: 'deposit',
          parentModal: options.target,
          added: function(address) {
            setupSelectors(options);
          },
          canceled: function() {
            hideSelf(options);
            if(options.error) {
              options.error({
                type: 'payswarm.website.NoAddress',
                message:
                  'You must provide a name and address before ' +
                  'performing any financial transactions.'
              });
            }
          }
        });
      }
      else {
        setupSelectors(options);
      }
    },
    error: function(err) {
      hideSelf(options);
      if(options.error) {
        options.error(err);
      }
    }
  });

  // set up tool tips
  $('[class=auto-tooltip]', target).tooltip();

  // bind review button
  $('[name="button-review-deposit"]', target).click(function() {
    var paymentToken = $('#deposit-payment-token-selector', target)[0].selected;
    var cleanedPaymentToken = {
      id: paymentToken.id,
      type: paymentToken.type,
      owner: paymentToken.owner,
      paymentToken: paymentToken.paymentToken,
      paymentGateway: paymentToken.paymentGateway,
      paymentMethod: paymentToken.paymentMethod
    };
    payswarm.deposit.sign({
      deposit: {
        '@context': 'http://purl.org/payswarm/v1',
        type: ['com:Transaction', 'com:Deposit'],
        payee: [{
          type: 'com:Payee',
          payeeRate: $('[name="amount"]', target).val(),
          payeeRateType: 'com:FlatAmount',
          destination: options.account
        }],
        source: cleanedPaymentToken
      },
      success: function(deposit) {
        // FIXME: get public account information for all payees
        var accounts = [];
        for(var i in deposit.transfer) {
          accounts.push({
            label: deposit.transfer[i].destination
          });
        }

        // show confirm page
        $('#deposit-content').empty().append(
          $.tmpl('deposit-confirm-tmpl', {
            tmpl: window.tmpl,
            data: window.data,
            deposit: deposit,
            paymentToken: paymentToken,
            account: options.account,
            accounts: accounts
          }));

        // go to top of page
        var target = options.target;
        $(target).animate({scrollTop: 0}, 0);

        // bind close button
        $('.btn-close', target).click(function() {
          hideSelf(options);
        });

        // bind back button
        $('[name="button-back"]', target).click(function() {
          // show review page again
          $('#deposit-content').empty().append(
            $.tmpl('deposit-review-tmpl', {
              tmpl: window.tmpl,
              data: window.data,
              account: options.account
            }));
          setupReviewPage(options);
        });

        // bind confirm button
        $('[name="button-confirm-deposit"]', target).click(function() {
          confirmDeposit(options, deposit, accounts);
        });
      },
      error: function(err) {
        var feedback = $('[name="feedback"]', target);
        website.util.processValidationErrors(feedback, target, err);
      }
    });
  });
}

function setupSelectors(options) {
  // install payment token selector
  selectors.paymentToken.install({
    target: $('#deposit-payment-token-selector'),
    identity: options.identity,
    parentModal: options.target,
    addModal: true
  });
}

function confirmDeposit(options, deposit, accounts) {
  var target = options.target;
  payswarm.deposit.confirm({
    deposit: $.extend({}, deposit, {
      '@context': 'http://purl.org/payswarm/v1',
      source: {
        id: deposit.source.id,
        type: deposit.source.type,
        owner: deposit.source.owner,
        paymentToken: deposit.source.paymentToken,
        paymentGateway: deposit.source.paymentGateway,
        paymentMethod: deposit.source.paymentMethod
      }
    }),
    success: function(deposit) {
      // show complete page
      $('#deposit-content').empty().append(
        $.tmpl('deposit-complete-tmpl', {
          tmpl: window.tmpl,
          data: window.data,
          deposit: deposit,
          paymentToken: deposit.source,
          account: options.account,
          accounts: accounts
        }));

      // go to top of page
      var target = options.target;
      $(target).animate({scrollTop: 0}, 0);

      // bind close button
      $('.btn-close', target).click(function() {
        hideSelf(options);
      });

      options.deposit = deposit;
      if(options.deposited) {
        options.deposited(deposit);
      }
    },
    error: function(err) {
      var feedback = $('[name="feedback"]', target);
      website.util.processValidationErrors(feedback, target, err);
    }
  });
}

function hideSelf(options) {
  options.target.modal('hide');
  if(!options.deposit && options.canceled) {
    options.canceled();
  }
  if(options.parentModal) {
    options.parentModal.modal('show');
  }
}

})(jQuery);
