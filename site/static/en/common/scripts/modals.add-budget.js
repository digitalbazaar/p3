/*!
 * Add Budget Modal
 *
 * @requires jQuery v1.6+ (http://jquery.com/)
 *
 * @author Dave Longley
 */
(function($) {

var modals = window.modals = window.modals || {};

/**
 * Shows an add Budget modal.
 *
 * Typical usage:
 *
 * modals.addBudget.show({
 *   parent: $('#parent-modal') (optional),
 *   identity: 'https://example.com/i/myidentity',
 *   added: function(budget),
 *   canceled: function() {}
 * });
 */
modals.addBudget = {};
modals.addBudget.show = function(options) {
  // load modal
  $('#modals-add-budget').replaceWith($.tmpl('modals-add-budget-tmpl', {
    tmpl: window.tmpl,
    data: window.data,
    identity: options.identity
  }));

  // set up modal
  var target = options.target = $('#modals-add-budget');
  $('.btn-close', target).click(function() {
    hideSelf(options);
  });
  target.on('show', function() {
    if(options.parentModal) {
      options.parentModal.modal('hide');
    }
  });

  // install account selector
  selectors.account.install({
    target: $('#add-budget-account-selector'),
    identity: options.identity,
    parentModal: target,
    addModal: true
  });

  // set up tool tips
  $('[rel="tooltip"]', target).tooltip();

  // add button clicked
  $('[name="button-add-budget"]', target).click(function() {
    payswarm.budgets.add({
      identity: options.identity,
      budget: {
        '@context': 'http://purl.org/payswarm/v1',
        label: $('[name="label"]', target).val(),
        amount: $('[name="amount"]', target).val(),
        psaRefresh: $('[name="refresh"] option:selected', target).val(),
        psaExpires: $('[name="expires"] option:selected', target).val(),
        source: $('#add-budget-account-selector')[0].selected.id
      },
      success: function(budget) {
        options.budget = budget;
        hideSelf(options);
        if(options.added) {
          options.added(budget);
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
  if(!options.budget && options.canceled) {
    options.canceled();
  }
  if(options.parentModal) {
    options.parentModal.modal('show');
  }
}

})(jQuery);
