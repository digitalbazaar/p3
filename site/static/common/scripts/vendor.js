/*!
 * Vendor Registration
 *
 * @requires jQuery v1.6+ (http://jquery.com/)
 * @requires jQuery Tools v1.2.6+ (+ history) (http://flowplayer.org/tools/)
 *
 * @author Manu Sporny
 * @author Dave Longley
 */
(function($) {

/**
 * Install identity selector with known session identities.
 */
function installIdentitySelector() {
  selectors.identity.install({
    target: $('#vendor-identity-selector'),
    identities: $.map(window.data.session.identities,
      function(v) { return v; }).filter(function(v) {
        return v.type === 'ps:VendorIdentity';
      }),
    addModal: true,
    addModalOptions: {
      identityTypes: ['ps:VendorIdentity'],
      selectedType: 'ps:VendorIdentity'
    },
    change: installAccountSelector,
    added: installAccountSelector,
    ready: function() {
      $('.vendor-identity-selector').show();
      installAccountSelector();
    }
  });
}

/**
 * Install account selector based on selected id.
 */
function installAccountSelector() {
  var idSelector = $('#vendor-identity-selector');
  var selected = idSelector[0].selected;

  if(selected) {
    selectors.account.install({
      target: $('#vendor-account-selector'),
      identity: selected.id,
      addModal: true,
      change: enableRegister,
      added: enableRegister,
      ready: enableRegister
    });
    $('.vendor-account-selector').show();
  } else {
    $('.vendor-account-selector').hide();
  }
}

/**
 * Enabled registration button only if identity and account are selected.
 */
function enableRegister() {
  var accountSelector = $('#vendor-account-selector');
  var selected = accountSelector[0].selected;

  if(selected) {
    $('#register').removeAttr('disabled');
  } else {
    $('#register').attr('disabled', 'disabled');
  }
}

/**
 * Performs a preferences request and then, if successful, posts the
 * preferences back to the original request callback.
 */
function requestPreferences() {
  // get the required values for the preferences request
  var identity = $('#vendor-identity-selector')[0].selected.id;
  var nonce = $('#response-nonce').data('nonce');

  // retrieve the identity preferences
  payswarm.identities.preferences.get({
    identity: identity,
    responseNonce: nonce,
    success: postPreferencesToCallback
  });
};

/**
 * Uses the result of a preferences request to build a POST-able form
 * back to the vendor registration callback at the requesting website. The
 * form is then auto-submitted. If the auto-submit fails, the form is shown
 * on-screen for a manual submit.
 */
function postPreferencesToCallback(preferences) {
  // update the vendor preferences form
  $('#vendor-register-feedback').replaceWith(
    $('#vendor-preferences').tmpl({
      encryptedMessage: JSON.stringify(preferences),
      registrationCallback:
        $('#registration-callback').data('callback')
    }));

  // attempt to auto-submit the form back to the registering site
  $('#vendor-register-feedback').hide();
  $('#vendor').submit();

  // show the manual registration completion button after 5 seconds
  setTimeout(function() {
    $('#vendor-register-feedback').show();
  }, 5000);
};

/**
 * Sets up the screen by creating selectors for identity and account, input
 * fields for key label and public key PEM. Installs a click handler that
 * updates the preferences as selected on the UI and POSTs them back to the
 * registration callback on the website that is registering.
 */
$(document).ready(function() {
  // set authority-base
  var authorityBase = window.location.protocol + '//' + window.location.host;
  $('[name="authority-base"]').text(authorityBase);

  $('#register').attr('disabled', 'disabled');
  $('#register').click(function(e) {
    e.preventDefault();

    // get the vendor preference values from the UI
    var identity = $('#vendor-identity-selector')[0].selected.id;
    var destination = $('#vendor-account-selector')[0].selected.id;
    var label = $('#access-key-label').val();
    var pem = $('#public-key-pem').val();

    // update the preferences associated with the vendor identity
    payswarm.identities.preferences.update({
      identity: identity,
      preferences: {
        destination: destination,
        publicKey: {
          label: label,
          publicKeyPem: pem
        }
      },
      success: requestPreferences
    });
  });

  installIdentitySelector();
});

})(jQuery);
