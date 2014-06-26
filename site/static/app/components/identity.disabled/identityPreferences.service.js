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

/*
payswarm.identities.preferences.update = function(options) {
  $.ajax({
    async: true,
    type: 'POST',
    url: options.identity + '/preferences',
    dataType: 'json',
    contentType: 'application/json',
    data: JSON.stringify(options.preferences),
    success: function(response, statusText) {
      if(options.success) {
        options.success(response);
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      if(options.error) {
        options.error(normalizeError(xhr, textStatus));
      }
    }
  });
};

payswarm.identities.preferences.get = function(options) {
  var prefUrl = options.identity + '/preferences';

  if(options.responseNonce) {
    prefUrl += '?response-nonce=' + encodeURIComponent(options.responseNonce);
  }

  $.ajax({
    async: true,
    type: 'GET',
    url: prefUrl,
    dataType: 'json',
    success: function(response, statusText) {
      if(options.success) {
        options.success(response);
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      if(options.error) {
        options.error(normalizeError(xhr, textStatus));
      }
    }
  });
};*/

  // FIXME: expose service to scope

  return service;
}

});
