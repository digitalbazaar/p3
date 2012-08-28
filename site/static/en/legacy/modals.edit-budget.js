/*!
 * Edit Budget Modal
 *
 * @requires jQuery v1.6+ (http://jquery.com/)
 *
 * @author David I. Lehn
 */
(function($) {

var modals = window.modals = window.modals || {};

/**
 * Shows an edit Budget modal.
 *
 * Typical usage:
 *
 * modals.editBudget.show({
 *   parent: $('#parent-modal') (optional),
 *   identity: 'https://example.com/i/myidentity',
 *   success: function(budget),
 *   canceled: function() {}
 * });
 */
modals.editBudget = {};
modals.editBudget.show = function(options) {
  async.auto({
    getBudget: function(cb) {
      payswarm.budgets.getOne({
        budget: options.budget,
        success: function(budget) {
          cb(null, budget);
        },
        error: function(err) {
          cb(err);
        }
      });
    },
    loadModal: function(cb) {
      $('#modals-edit-budget').replaceWith($.tmpl('modals-edit-budget-tmpl', {
        data: window.data
      }));
      cb();
    },
    loadBudget: ['getBudget', 'loadModal', function(cb, results) {
      $('#modals-budget-form').replaceWith($.tmpl('modals-budget-form-tmpl', {
        tmpl: window.tmpl,
        data: window.data,
        identity: options.identity,
        budget: results.getBudget,
        editor: true
      }));
      cb();
    }],
    setupModal: ['loadBudget', function(cb, results) {
      // set up modal
      var target = options.target = $('#modals-edit-budget');
      $('.btn-close', target).click(function() {
        hideSelf(options, {cancelled: true});
      });
      target.on('show', function() {
        if(options.parentModal) {
          options.parentModal.modal('hide');
        }
      });

      // install account selector
      selectors.account.install({
        target: $('#edit-budget-account-selector'),
        identity: options.identity,
        selectedAccount: results.getBudget.source,
        parentModal: target,
        addModal: true
      });

      // set up tool tips
      $('[rel="tooltip"]', target).tooltip();

      // edit button clicked
      $('[name="button-edit-budget"]', target).click(function() {
        payswarm.budgets.update({
          budget: {
            '@context': 'http://purl.org/payswarm/v1',
            id: options.budget,
            label: $('[name="label"]', target).val(),
            amount: $('[name="amount"]', target).val(),
            psaMaxPerUse: $('[name="max-per-use"]', target).val(),
            psaRefresh: $('[name="refresh"] option:selected', target).val(),
            psaExpires: $('[name="expires"] option:selected', target).val(),
            source: $('#edit-budget-account-selector')[0].selected.id
          },
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
      console.error('Edit Budget', err);
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
