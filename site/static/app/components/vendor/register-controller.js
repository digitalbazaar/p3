/*!
 * Vendor Registration.
 *
 * @author Manu Sporny
 * @author Dave Longley
 */
define([], function() {

'use strict';

/* @ngInject */
function factory(
  $scope, $timeout, $sce, psAddressService, brAlertService, brIdentityService,
  psIdentityPreferencesService, config) {
  var self = this;
  self.identity = brIdentityService.identity;
  self.loading = false;
  self.registered = false;
  self.publicKey = {
    label: config.data.publicKey.label,
    publicKeyPem: config.data.publicKey.publicKeyPem
  };
  self.authorityBase = window.location.protocol + '//' + window.location.host;
  self.registrationType = config.data.registrationType || 'vendor';
  self.registrationCallback = $sce.trustAsResourceUrl(
    config.data.registrationCallback) || null;
  self.responseNonce = config.data.responseNonce || null;
  self.selection = {
    account: null
  };

  self.register = function() {
    // update the preferences associated with the vendor identity
    self.loading = true;
    psAddressService.collection.getAll({force: true})
      .then(function(addresses) {
        if(addresses.length === 0) {
          self.showAddAddressModal = true;
          var err = new Error('Address not found.');
          err.type = 'payswarm.website.AddressNotFound';
          throw err;
        }
      })
      .then(function() {
        // update and get identity preferences with nonce
        return psIdentityPreferencesService.update({
          '@context': config.data.contextUrls.payswarm,
          type: 'IdentityPreferences',
          destination: self.selection.account.id,
          publicKey: self.publicKey
        }, {
          responseNonce: self.responseNonce
        });
      })
      .then(postPreferencesToCallback)
      .then(function() {
        self.registered = true;
      })
      .catch(function(err) {
        if(err && err.type === 'payswarm.website.AddressNotFound') {
          // address modal will re-call register()
          return;
        }
        brAlertService.add('error', err);
      })
      .then(function() {
        self.loading = false;
        $scope.$apply();
      });
  };

  /**
   * Uses the result of a preferences request to build a POST-able form
   * back to the registration callback at the requesting website. The
   * form is then auto-submitted. If the auto-submit fails, the form is shown
   * on-screen for a manual submit.
   *
   * @param preferences the identity's preferences in an encrypted message.
   */
  function postPreferencesToCallback(preferences) {
    self.encryptedMessage = JSON.stringify(preferences);

    // done if no callback
    if(!self.registrationCallback) {
      return Promise.resolve();
    }

    // attempt to auto-submit the form back to the registering site
    $scope.$apply();
    // FIXME: angularify this
    $('#vendor-form').submit();

    // show the manual registration completion button after a timeout period
    var registrationDelay = (self.registrationType === 'vendor') ? 5000 : 0;
    return Promise.resolve($timeout(function() {}, registrationDelay));
  }
}

return {RegisterController: factory};

});
