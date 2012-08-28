/*!
 * Edit Account Modal
 *
 * @requires jQuery v1.6+ (http://jquery.com/)
 *
 * @author David I. Lehn
 */
(function($) {

var modals = window.modals = window.modals || {};

/**
 * Shows an edit Account modal.
 *
 * Typical usage:
 *
 * modals.editAccount.show({
 *   parent: $('#parent-modal') (optional),
 *   identity: 'https://example.com/i/myidentity',
 *   success: function(account),
 *   canceled: function() {}
 * });
 */
modals.editAccount = {};
modals.editAccount.show = function(options) {
  async.auto({
    getAccount: function(cb) {
      payswarm.accounts.getOne({
        account: options.account,
        success: function(account) {
          cb(null, account);
        },
        error: function(err) {
          cb(err);
        }
      });
    },
    loadModal: function(cb) {
      $('#modals-edit-account').replaceWith($.tmpl('modals-edit-account-tmpl', {
        data: window.data
      }));
      cb();
    },
    loadAccount: ['getAccount', 'loadModal', function(cb, results) {
      var psaPublic = results.getAccount.psaPublic;
      var visibility = 'hidden';
      if(psaPublic.indexOf('owner') != -1 &&
        psaPublic.indexOf('label') != -1 ) {
        visibility = 'public';
      }
      $('#modals-account-form').replaceWith($.tmpl('modals-account-form-tmpl', {
        tmpl: window.tmpl,
        data: window.data,
        identity: options.identity,
        account: results.getAccount,
        visibility: visibility,
        editor: true
      }));
      cb();
    }],
    setupModal: ['loadAccount', function(cb) {
      // set up modal
      var target = options.target = $('#modals-edit-account');
      $('.btn-close', target).click(function() {
        hideSelf(options, {cancelled: true});
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

      // edit button clicked
      $('[name="button-edit-account"]', target).click(function() {
        // build the account object
        var account = {
          '@context': 'http://purl.org/payswarm/v1',
          id: options.account,
          label: $('[name="label"]', target).val(),
          psaPublic: [],
          currency: $('[name="currency"] option:selected', target).val()
        };
        if($('[name="visibility"] :selected', target).val() == 'public') {
          account.psaPublic = ['label', 'owner'];
        }

        payswarm.accounts.update({
          account: account,
          success: function(response) {
            hideSelf(options, {cancelled: false});
            if(options.success) {
              options.success(response);
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
      cb();
    }],
  }, function(err) {
    // FIXME
    if(err) {
      console.error('Edit Account', err);
    }
  });
};

function hideSelf(options, hideOptions) {
  options.target.modal('hide');
  if(hideOptions.cancelled && options.canceled) {
    options.canceled();
  }
  if(options.parentModal) {
    options.parentModal.modal('show');
  }
}

})(jQuery);
