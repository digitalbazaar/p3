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
function installIdentitySelector(registrationType) {
  var identityTypes = ['ps:VendorIdentity'];
  var selectedType = 'ps:VendorIdentity';
  var identities = $.map(window.data.session.identities,
    function(v) { return v; });
  if(registrationType != 'Vendor') {
    identityTypes.push('ps:PersonalIdentity');
    selectedType = 'ps:PersonalIdentity';
  }
  else {
    // allow only vendor identities to be selected
    identities = $.map(window.data.session.identities,
      function(v) { return v; }).filter(function(v) {
        return v.type === 'ps:VendorIdentity';
      });
  }

  selectors.identity.install({
    target: $('#identity-selector'),
    identities: identities,
    addModal: true,
    addModalOptions: {
      identityTypes: identityTypes,
      selectedType: selectedType
    },
    change: installAccountSelector,
    added: installAccountSelector,
    ready: function() {
      $('.identity-selector').show();
      installAccountSelector();
    }
  });
}

/**
 * Install account selector based on selected id.
 */
function installAccountSelector() {
  var idSelector = $('#identity-selector');
  var selected = idSelector[0].selected;

  if(selected) {
    selectors.account.install({
      target: $('#account-selector'),
      identity: selected.id,
      addModal: true,
      change: enableRegister,
      added: enableRegister,
      ready: enableRegister
    });
    $('.account-selector').show();
  } else {
    $('.account-selector').hide();
  }
}

/**
 * Enabled registration button only if identity and account are selected.
 */
function enableRegister() {
  var accountSelector = $('#account-selector');
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
  var identity = $('#identity-selector')[0].selected.id;
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
 * back to the registration callback at the requesting website. The
 * form is then auto-submitted. If the auto-submit fails, the form is shown
 * on-screen for a manual submit.
 */
function postPreferencesToCallback(preferences) {
  // update the vendor preferences form
  $('#register-feedback').replaceWith(
    $('#preferences').tmpl({
      encryptedMessage: JSON.stringify(preferences),
      registrationCallback:
        $('#registration-callback').data('callback')
    }));

  // attempt to auto-submit the form back to the registering site
  $('#register-feedback').hide();
  $('#vendor').submit();

  // show the manual registration completion button after a timeout period
  var registrationDelay = 0;
  if(registrationType == 'Vendor') {
    registrationDelay = 5000;
  }
  setTimeout(function() {
    $('#register-feedback').show();
  }, registrationDelay);
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
    var identity = $('#identity-selector')[0].selected.id;
    var destination = $('#account-selector')[0].selected.id;
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

  installIdentitySelector(registrationType);
});

})(jQuery);
