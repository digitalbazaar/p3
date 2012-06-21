/*!
 * Add Identity Modal
 *
 * @requires jQuery v1.6+ (http://jquery.com/)
 *
 * @author Dave Longley
 */
(function($) {

var modals = window.modals = window.modals || {};

/**
 * Shows an add Identity modal.
 *
 * Typical usage:
 *
 * modals.addIdentity.show({
 *   parent: $('#parent-modal') (optional),
 *   identityTypes: ['ps:PersonalIdentity', 'ps:VendorIdentity'] (optional),
 *   selectedType: identityTypes[0] (optional),
 *   added: function(identity),
 *   canceled: function() {}
 * });
 */
modals.addIdentity = {};
modals.addIdentity.show = function(options) {
  // load modal
  var baseUrl = window.location.protocol + '//' + window.location.host;
  var identityTypes = options.identityTypes ||
    ['ps:PersonalIdentity', 'ps:VendorIdentity'];
  var selectedType = options.selectedType ||
    (identityTypes.length ? identityTypes[0] : null);

  $('#modals-add-identity').replaceWith($.tmpl('modals-add-identity-tmpl', {
    tmpl: window.tmpl,
    data: window.data,
    identityTypes: identityTypes,
    selectedType: selectedType,
    baseUrl: baseUrl,
    profile: window.data.session.profile
  }));

  // set up modal
  var target = options.target = $('#modals-add-identity');
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

  // check duplicates
  $('#add-identity-form [name="slug"]').bind('keyup change', function() {
    website.util.checkDuplicateId(
      $(this), 'ps:PersonalIdentity', $('#identity-duplicate'));
  });
  $('#add-account-form [name="slug"]').bind('keyup change', function() {
    var owner = baseUrl + '/i/' + $('#add-identity-form [name="slug"]').val();
    website.util.checkDuplicateId(
      $(this), 'ps:FinancialAccount', $('#account-duplicate'), owner);
  });

  // handle change of identity type
  $('#add-identity-form [name="type"]').change(function() {
    var type = $(this).val();
    if(type === 'ps:VendorIdentity') {
      $('#help-personal-identity').hide();
      $('#help-vendor-identity').show();
      $('#identity-type-fields').empty().append(
        $.tmpl('add-identity-vendor-tmpl', {
          tmpl: window.tmpl,
          data: window.data
        }));
    }
    else {
      $('#help-vendor-identity').hide();
      $('#help-personal-identity').show();
      $('#identity-type-fields').empty();
    }
  });

  // add button clicked
  $('[name="button-add-identity"]', target).click(function() {
    // build identity object
    var type = $('[name="type"] option:selected', target).val();
    var identity = {
      '@context': 'http://purl.org/payswarm/v1',
      type: type,
      psaSlug: $('[name="slug"]', target).val(),
      label: $('[name="label"]', target).val()
    };
    if(type === 'ps:VendorIdentity') {
      identity.homepage = $('[name="vendor-website"]', target).val(),
      identity.description = $('[name="vendor-description"]', target).val();
    }

    // add identity
    payswarm.identities.add({
      identity: identity,
      success: function(identity) {
        addAccount(options, identity)
      },
      error: function(err) {
        // if identity is a duplicate, add account to it
        if(err.type === 'payswarm.website.DuplicateIdentity') {
          identity.id = baseUrl + '/i/' + identity.psaSlug;
          addAccount(options, identity);
        }
        else {
          var feedback = $('[name="feedback"]', target);
          website.util.processValidationErrors(
            feedback, $('#add-identity-form'), err);
        }
      }
    });
  });

  // show modal
  target.modal({backdrop: true});
};

function addAccount(options, identity) {
  // add account
  var target = options.target;
  payswarm.accounts.add({
    identity: identity.id,
    account: {
      '@context': 'http://purl.org/payswarm/v1',
      psaSlug: $('#add-account-form [name="slug"]').val(),
      label: $('#add-account-form [name="label"]').val(),
      psaPrivacy: $('#add-account-form [name="privacy"] option:selected').val(),
      currency: $('#add-account-form [name="currency"] option:selected').val()
    },
    success: function(account) {
      options.account = account;
      hideSelf(options);
      if(options.added) {
        options.added(identity, account);
      }
    },
    error: function(err) {
      var feedback = $('[name="feedback"]', target);
      website.util.processValidationErrors(
        feedback, $('#add-account-form'), err);
    }
  });
}

function hideSelf(options) {
  options.target.modal('hide');
  if(!options.account && options.canceled) {
    options.canceled();
  }
  if(options.parentModal) {
    options.parentModal.modal('show');
  }
}

})(jQuery);
