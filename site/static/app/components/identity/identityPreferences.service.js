/*!
 * PaySwarm Identity Preferences Service.
 *
 * @author Dave Longley
 */
define([], function() {

// FIXME: move to another module

var deps = ['$rootScope'];
return {svcIdentityPreferences: deps.concat(factory)};

function factory($rootScope) {
  var service = {};

  // update identity preferences
  service.updatePreferences = function(identityId, preferences, nonce) {
    service.state.loading = true;
    // FIXME: use $http
    /*payswarm.identities.preferences.update({
      identity: identityId,
      preferences: preferences,
      success: function() {
        // get identity preferences and post to callback
        payswarm.identities.preferences.get({
          identity: identityId,
          responseNonce: nonce,
          success: function(prefs) {
            service.state.loading = false;
            // update preferences
            service.identity.preferences = prefs;
            callback(null, prefs);
            $rootScope.$apply();
          },
          error: function(err) {
            service.state.loading = false;
            callback(err);
            $rootScope.$apply();
          }
        });
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
        $rootScope.$apply();
      }
    });
    // FIXME: return Promise
  */};

  // FIXME: expose service to scope

  return service;
}

});
