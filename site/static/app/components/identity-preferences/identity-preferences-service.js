/*!
 * PaySwarm Identity Preferences Service.
 *
 * @author Dave Longley
 */
define([], function() {

var deps = ['$http', '$rootScope', 'IdentityService'];
return {IdentityPreferencesService: deps.concat(factory)};

function factory($http, $rootScope, IdentityService) {
  var service = {};
  service.state = {
    loading: false
  };


  // get identity preferences
  service.get = function(options) {
    var url = IdentityService.identity.id + '/preferences';

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
  service.update = function(preferences, nonce) {
    service.state.loading = true;
    var url = IdentityService.identity.id + '/preferences';

    service.state.loading = false;
    return Promise.resolve($http.post(url, preferences))
      .then(function() {
        var options = {};
        if(nonce) {
          options.responseNonce = nonce;
        }
        return service.get(options)
          .then(function(preferences) {
            service.state.loading = false;
            // update preferences
            IdentityService.identity.preferences = preferences;
            return preferences;
          });
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

});
