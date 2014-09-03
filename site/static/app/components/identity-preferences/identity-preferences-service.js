/*!
 * PaySwarm Identity Preferences Service.
 *
 * @author Dave Longley
 */
define([], function() {

'use strict';

/* @ngInject */
function factory($http, $rootScope, brIdentityService) {
  var service = {};
  service.state = {
    loading: false
  };


  // get identity preferences
  service.get = function(options) {
    var url = brIdentityService.identity.id + '/preferences';

    if(options.responseNonce) {
      url += '?response-nonce=' + encodeURIComponent(options.responseNonce);
    }

    // FIXME: need loading count since this is called from update
    service.state.loading = true;
    return Promise.resolve($http.get(url))
      .then(function(response) {
        service.state.loading = false;
        return response.data;
      })
      .catch(function(err) {
        service.state.loading = false;
        throw err;
      });
  };

  // update identity preferences
  service.update = function(preferences, options) {
    service.state.loading = true;
    var url = brIdentityService.identity.id + '/preferences';

    service.state.loading = false;
    return Promise.resolve($http.post(url, preferences))
      .then(function() {
        return service.get(options || {});
      })
      .then(function(preferences) {
        service.state.loading = false;
        // update preferences
        brIdentityService.identity.preferences = preferences;
        return preferences;
      })
      .catch(function(err) {
        service.state.loading = false;
        throw err;
      });
  };

  // expose service to scope
  $rootScope.app.services.identityPreferences = service;

  return service;
}

return {IdentityPreferencesService: factory};

});
