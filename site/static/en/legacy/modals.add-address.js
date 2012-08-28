/*!
 * Add Address Modal
 *
 * @requires jQuery v1.6+ (http://jquery.com/)
 *
 * @author Dave Longley
 */
(function($) {

var modals = window.modals = window.modals || {};

/**
 * Shows an add Address modal.
 *
 * Typical usage:
 *
 * modals.addAddress.show({
 *   showAlert: 'deposit'|'purchase' (optional),
 *   parent: $('#parent-modal') (optional),
 *   identity: 'https://example.com/i/myidentity',
 *   added: function(address),
 *   canceled: function() {}
 * });
 */
modals.addAddress = {};
modals.addAddress.show = function(options) {
  // load modal
  $('#modals-add-address').replaceWith($.tmpl('modals-add-address-tmpl', {
    tmpl: window.tmpl,
    data: window.data,
    identity: options.identity,
    address: {},
    showAlert: options.showAlert
  }));

  // set up modal
  var target = options.target = $('#modals-add-address');
  $('.btn-close', target).click(function() {
    hideSelf(options);
  });
  target.on('show', function() {
    if(options.parentModal) {
      options.parentModal.modal('hide');
    }
  });
  setupValidateForm(options);

  // show modal
  target.modal({backdrop: true});
};

function setupValidateForm(options) {
  var target = options.target;

  // set up tool tips
  $('[rel="tooltip"]', target).tooltip();

  // validate button clicked
  $('[name="button-validate-address"]', target).click(function() {
    var originalAddress = {
      '@context': 'http://purl.org/payswarm/v1',
      type: 'vcard:Address',
      label: $('[name="label"]', target).val(),
      fullName: $('[name="name"]', target).val(),
      streetAddress: $('[name="street"]', target).val(),
      locality: $('[name="locality"]', target).val(),
      region: $('[name="region"]', target).val(),
      postalCode: $('[name="postal-code"]', target).val(),
      countryName: $('[name="country"]', target).val()
    };

    // do address validation
    payswarm.addresses.validate({
      identity: options.identity,
      address: originalAddress,
      success: function(validatedAddress) {
        // save validated address, keep original name and label
        validatedAddress = $.extend(validatedAddress, {
          '@context': 'http://purl.org/payswarm/v1',
          type: 'vcard:Address',
          label: originalAddress.label,
          fullName: originalAddress.fullName
        });

        // show save form
        $('[name="content"]', target).empty().append(
          $.tmpl('address-add-form-tmpl', {
            data: window.data,
            validatedAddress: validatedAddress,
            originalAddress: originalAddress
          }));

        // include validated address if it is actually validated
        var addresses = [];
        if(validatedAddress.psaValidated) {
          addresses.push(validatedAddress);
        }
        addresses.push(originalAddress);

        // show selector for validated vs. original address
        selectors.address.install({
          target: $('#add-address-selector'),
          identity: options.identity,
          addresses: addresses,
          addModal: false,
          ready: function() {
            // back button clicked
            $('[name="button-back"]', target).click(function() {
              // show validate form
              $('[name="content"]', target).empty().append(
                $.tmpl('address-validate-form-tmpl', {
                  data: window.data,
                  identity: options.identity,
                  address: originalAddress,
                  showAlert: options.showAlert
                }));
              setupValidateForm(options);
            });

            // add button clicked
            $('[name="button-add-address"]', target).click(function() {
              payswarm.addresses.add({
                identity: options.identity,
                address: $('#add-address-selector')[0].selected,
                success: function(address) {
                  options.address = address;
                  hideSelf(options);
                  if(options.added) {
                    options.added(address);
                  }
                },
                error: function(err) {
                  handleError(err, target);
                }
              });
            });
          },
          error: function(err) {
            handleError(err, target);
          }
        });
      },
      error: function(err) {
        handleError(err, target);
      }
    });
  });
};

function handleError(err, target) {
  var feedback = $('[name="feedback"]', target);
  website.util.processValidationErrors(feedback, target, err);
}

function hideSelf(options) {
  options.target.modal('hide');
  if(!options.address && options.canceled) {
    options.canceled();
  }
  else if(options.parentModal) {
    options.parentModal.modal('show');
  }
}

})(jQuery);
