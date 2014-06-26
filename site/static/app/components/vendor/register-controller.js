/*!
 * Vendor Registration.
 *
 * @author Manu Sporny
 * @author Dave Longley
 */
define(['async', 'payswarm.api'], function(async, payswarm) {

var deps = [
  '$scope', '$timeout', 'AddressService', 'AlertService',
  'IdentityService', 'config'];
return {RegisterCtrl: deps.concat(factory)};

function factory(
  $scope, $timeout, AddressService, AlertService, IdentityService, config) {
  // FIXME: only 1 identity now (no profile) ... no "multiple" identities for
  // a particular session ... will need to add a "switch identities" modal
  // thing? or option to login as another user?
  $scope.model = {};
  $scope.loading = false;
  $scope.registered = false;
  $scope.identities = [];
  $scope.session = config.data.session;
  $scope.model = {};
  $scope.model.publicKey = {
    label: config.data.publicKey.label,
    // FIXME: hack until PEM can be in config.data
    publicKeyPem: $('#public-key-pem').val()
  };
  $scope.authorityBase = window.location.protocol + '//' + window.location.host;
  $scope.registrationType = config.data.registrationType || 'vendor';
  $scope.registrationCallback = config.data.registrationCallback || null;
  $scope.responseNonce = config.data.responseNonce || null;
  $scope.selection = {
    identity: null,
    account: null
  };

  // FIXME: only need to check 1 identity, current one (no profile anymore)
  $scope.filterIdentities = function() {
    $scope.identities = IdentityService.identities;
    if($scope.registrationType === 'vendor') {
      // allow only vendor identities to be selected
      $scope.identityTypes = ['VendorIdentity'];
      $scope.identities = $scope.identities.filter(function(v) {
        return v.type === 'VendorIdentity';
      });
    } else {
      $scope.identityTypes = ['PersonalIdentity', 'VendorIdentity'];
    }

    // keep old selection if possible
    var hasSelection =
      $scope.selection.identity &&
      $scope.identities.some(function(v) {
        return v.id === $scope.selection.identity.id;
      });
    if(!hasSelection) {
      // else use current identity if possible
      var hasCurrent = $scope.identities.some(function(v) {
        return v.id === IdentityService.identity.id;
      });
      if(hasCurrent) {
        $scope.selection.identity = IdentityService.identity;
      } else {
        // use first listed or none
        $scope.selection.identity = $scope.identities[0] || null;
      }
    }
  };

  // FIXME: remove, N/A
  /*
  $scope.allIdentities = IdentityService.identities;
  $scope.$watch('allIdentities', function(value) {
    $scope.filterIdentities();
  }, true);*/

  $scope.register = function() {
    // update the preferences associated with the vendor identity
    $scope.loading = true;
    AddressService.getAll($scope.selection.identity.id, {force: true})
      .then(function(addresses) {
        $scope.loading = false;
        if(addresses.length === 0) {
          $scope.showAddAddressModal = true;
          throw {type: 'payswarm.website.AddressNotFound'};
        }
        return addresses;
      })
      .then(function() {
        return IdentityPreferencesService.update({
          identity: $scope.selection.identity.id,
          preferences: {
            '@context': config.data.contextUrl,
            destination: $scope.selection.account.id,
            publicKey: $scope.model.publicKey
          }
        });
      })
      .then(function() {
        // get identity preferences
        return IdentityPreferencesService.get({
          identity: $scope.selection.identity.id,
          responseNonce: $scope.responseNonce
        });
      })
      .then(postPreferencesToCallback)
      .then(function() {
        $scope.registered = true;
      })
      .catch(function(err) {
        if(err && err.type === 'payswarm.website.AddressNotFound') {
          // address modal will re-call register()
          return;
        }
        AlertService.add('error', err);
      })
      .then(function() {
        $scope.loading = false;
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
    $scope.encryptedMessage = JSON.stringify(preferences);

    // done if no callback
    if(!$scope.registrationCallback) {
      return Promise.resolve();
    }

    // attempt to auto-submit the form back to the registering site
    $scope.$apply();
    $('#vendor-form').submit();

    // show the manual registration completion button after a timeout period
    var registrationDelay = ($scope.registrationType === 'vendor') ? 5000 : 0;
    return Promise.resolve($timeout(function(){}, registrationDelay));
  }
}

});
