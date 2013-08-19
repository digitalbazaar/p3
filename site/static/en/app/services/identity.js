/*!
 * PaySwarm Identity Service.
 *
 * @author Dave Longley
 */
(function() {

define(['angular', 'payswarm.api'], function(angular, payswarm) {

var name = 'svcIdentity';
var deps = ['$rootScope'];
var factory = function($rootScope) {
  var service = {};

  var data = window.data || {};
  var session = data.session || {auth: false};
  service.identity = session.identity || null;
  service.identityMap = session.identities || {};
  service.identities = [];
  angular.forEach(service.identityMap, function(identity) {
    service.identities.push(identity);
  });
  service.state = {
    loading: false
  };

  // add a new identity
  service.add = function(identity, callback) {
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.identities.add({
      identity: identity,
      success: function(identity) {
        service.identityMap[identity.id] = identity;
        service.identities.push(identity);
        service.state.loading = false;
        callback(null, identity);
        $rootScope.$apply();
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
        $rootScope.$apply();
      }
    });
  };

  // update identity preferences
  service.updatePreferences = function(
    identityId, preferences, nonce, callback) {
    if(typeof nonce === 'function') {
      callback = nonce;
      nonce = undefined;
    }
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.identities.preferences.update({
      identity: identityId,
      preferences: preferences,
      success: function() {
        // get identity preferences and post to callback
        payswarm.identities.preferences.get({
          identity: identityId,
          responseNonce: nonce,
          success: function(prefs) {
            service.state.loading = false;
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
  };

  return service;
};

return {name: name, deps: deps, factory: factory};
});

})();
