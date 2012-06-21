/*!
 * Add Account Modal
 *
 * @requires jQuery v1.6+ (http://jquery.com/)
 *
 * @author Dave Longley
 */
(function($) {

var modals = window.modals = window.modals || {};

/**
 * Shows an add Account modal.
 *
 * Typical usage:
 *
 * modals.addAccount.show({
 *   parent: $('#parent-modal') (optional),
 *   identity: 'https://example.com/i/myidentity',
 *   added: function(account),
 *   canceled: function() {}
 * });
 */
modals.addAccount = {};
modals.addAccount.show = function(options) {
  // load modal
  $('#modals-add-account').replaceWith($.tmpl('modals-add-account-tmpl', {
    tmpl: window.tmpl,
    data: window.data,
    identity: options.identity,
    showAlert: options.showAlert
  }));

  // set up modal
  var target = options.target = $('#modals-add-account');
  $('.btn-close', target).click(function() {
    hideSelf(options);
  });
  target.on('show', function() {
    if(options.parentModal) {
      options.parentModal.modal('hide');
    }
  });

  // set up tool tips
  $('[rel="tooltip"]', target).tooltip();

  // bind transmitters
  window.website.setupTransmitters(target);

  // check duplicate
  $('[name="slug"]', target).bind('keyup change', function() {
    website.util.checkDuplicateId(
      $(this), 'ps:FinancialAccount', $('#account-duplicate'),
      options.identity);
  });

  // add button clicked
  $('[name="button-add-account"]', target).click(function() {
    payswarm.accounts.add({
      identity: options.identity,
      account: {
        // FIXME: add context for psa:
        '@context': 'http://purl.org/payswarm/v1',
        psaSlug: $('[name="slug"]', target).val(),
        label: $('[name="label"]', target).val(),
        psaPrivacy: $('[name="privacy"] option:selected', target).val(),
        currency: $('[name="currency"] option:selected', target).val()
      },
      success: function(account) {
        options.account = account;
        hideSelf(options);
        if(options.added) {
          options.added(account);
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
  if(!options.address && options.canceled) {
    options.canceled();
  }
  if(options.parentModal) {
    options.parentModal.modal('show');
  }
}

})(jQuery);
