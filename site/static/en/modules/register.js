/*!
 * Vendor Registration
 *
 * @author Manu Sporny
 * @author Dave Longley
 */
(function($) {

var module = angular.module('payswarm');

module.controller('RegisterCtrl', function(
  $scope, $timeout, svcIdentity, svcAccount, svcAddress) {
  $scope.model = {};
  var data = window.data;
  $scope.feedback = {};
  $scope.loading = false;
  $scope.registered = false;
  $scope.identities = [];
  $scope.session = data.session;
  $scope.model = {};
  $scope.model.publicKey = {
    label: data.publicKey.label,
    // FIXME: hack until PEM can be in window.data
    publicKeyPem: $('#public-key-pem').val()
  };
  $scope.authorityBase = window.location.protocol + '//' + window.location.host;
  $scope.registrationType = data.registrationType || 'vendor';
  $scope.registrationCallback = data.registrationCallback || null;
  $scope.responseNonce = data.responseNonce || null;
  $scope.selection = {
    identity: null,
    account: null
  };
  $scope.filterIdentities = function() {
    $scope.identities = svcIdentity.identities;
    if($scope.registrationType === 'vendor') {
      // allow only vendor identities to be selected
      $scope.identityTypes = ['ps:VendorIdentity'];
      $scope.identities = $scope.identities.filter(function(v) {
        return v.type === 'ps:VendorIdentity';
      });
    }
    else {
      $scope.identityTypes = ['ps:PersonalIdentity', 'ps:VendorIdentity'];
    }
    $scope.selection.identity = $scope.identities[0] || null;
  };

  $scope.allIdentities = svcIdentity.identities;
  $scope.$watch('allIdentities', function(value) {
    $scope.filterIdentities();
  }, true);

  $scope.register = function() {
    // update the preferences associated with the vendor identity
    $scope.loading = true;
    async.auto({
      getAddresses: function(callback) {
        svcAddress.get({force: true}, function(err, addresses) {
          $scope.loading = false;
          if(!err && addresses.length === 0) {
            $scope.showAddAddressModal = true;
            err = {
              type: 'payswarm.website.AddressNotFound'
            };
          }
          callback(err);
        });
      },
      main: ['getAddresses', function(callback) {
        var identity = $scope.selection.identity.id;
        payswarm.identities.preferences.update({
          identity: identity,
          preferences: {
            '@context': 'http://purl.org/payswarm/v1',
            destination: $scope.selection.account.id,
            publicKey: $scope.model.publicKey
          },
          success: function() {
            // get identity preferences and post to callback
            payswarm.identities.preferences.get({
              identity: identity,
              responseNonce: $scope.responseNonce,
              success: function(preferences) {
                postPreferencesToCallback(preferences, callback);
              },
              error: callback
            });
          },
          error: callback
        });
      }]
    }, function(err, results) {
      if(err && err.type === 'payswarm.website.AddressNotFound') {
        // address modal will re-call register()
        $scope.feedback = {};
        return;
      }
      if(!err) {
        $scope.registered = true;
      }
      $scope.loading = false;
      $scope.feedback.error = err;
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
   * @param callback the function to call when done.
   */
  function postPreferencesToCallback(preferences, callback) {
    $scope.encryptedMessage = JSON.stringify(preferences);

    // done if no callback
    if(!$scope.registrationCallback) {
      return callback();
    }

    // attempt to auto-submit the form back to the registering site
    $scope.$apply();
    $('#vendor-form').submit();

    // show the manual registration completion button after a timeout period
    var registrationDelay = ($scope.registrationType === 'vendor') ? 5000 : 0;
    $timeout(callback, registrationDelay);
  }
});

})(jQuery);
