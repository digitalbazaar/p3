/*!
 * PaySwarm API
 *
 * This file provides methods to get data from and post data to the server.
 *
 * @requires jQuery v1.6+ (http://jquery.com/)
 *
 * @author Dave Longley
 */
(function($) {

// payswarm API
var payswarm = window.payswarm = window.payswarm || {};

// default @context
payswarm.CONTEXT_URL = 'https://w3id.org/payswarm/v1';

// addresses API
payswarm.addresses = {};

/**
 * Get the addresses for an identity.
 *
 * Usage:
 *
 * payswarm.addresses.get({
 *   identity: 'https://example.com/i/myidentity',
 *   success: function(addresses) {},
 *   error: function(err) {}
 * });
 */
payswarm.addresses.get = function(options) {
  $.ajax({
    async: true,
    type: 'GET',
    url: options.identity + '/addresses',
    dataType: 'json',
    success: function(response, statusText) {
      if(options.success) {
        options.success(response);
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      // if 404, assume no addresses
      if(xhr.status === 404) {
        if(options.success) {
          options.success([]);
        }
      }
      else if(options.error) {
        options.error(normalizeError(xhr, textStatus));
      }
    }
  });
};

/**
 * Validates an address for an identity.
 *
 * Usage:
 *
 * payswarm.addresses.validate({
 *   identity: 'https://example.com/i/myidentity',
 *   address: address,
 *   success: function(address) {},
 *   error: function(err) {}
 * });
 */
payswarm.addresses.validate = function(options) {
  $.ajax({
    async: true,
    type: 'POST',
    url: options.identity + '/addresses?action=validate',
    dataType: 'json',
    contentType: 'application/json',
    data: JSON.stringify(options.address),
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

/**
 * Add an address to an identity.
 *
 * Usage:
 *
 * payswarm.addresses.add({
 *   identity: 'https://example.com/i/myidentity',
 *   address: address,
 *   success: function(address) {},
 *   error: function(err) {}
 * });
 */
payswarm.addresses.add = function(options) {
  $.ajax({
    async: true,
    type: 'POST',
    url: options.identity + '/addresses',
    dataType: 'json',
    contentType: 'application/json',
    data: JSON.stringify(options.address),
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

/**
 * Deletes an address from an identity.
 *
 * Usage:
 *
 * payswarm.addresses.del({
 *   address: address,
 *   success: function() {},
 *   error: function(err) {}
 * });
 */
payswarm.addresses.del = function(options) {
  $.ajax({
    async: true,
    type: 'DELETE',
    url: options.identity + '/addresses?addressId=' +
      encodeURIComponent(options.addressId),
    success: function(data, textStatus) {
      if(options.success) {
        options.success();
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      if(options.error) {
        options.error(normalizeError(xhr, textStatus));
      }
    }
  });
};

// preferences API
payswarm.identities = {};
payswarm.identities.preferences = {};

/**
 * Updates preference information for a particular identity.
 *
 * Usage:
 *
 * payswarm.identities.preferences.update({
 *   identity: identity,
 *   preferences: preferences,
 *   success: function(identity) {},
 *   error: function(err) {}
 * });
 */
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

/**
 * Retrieves preference information for a particular identity.
 *
 * Usage:
 *
 * payswarm.identities.preferences.update({
 *   identity: identity,
 *   responseNonce: nonce,
 *   success: function(preferences) {},
 *   error: function(err) {}
 * });
 */
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
};

/**
 * Normalizes an error that occurred during an XHR.
 *
 * @param xhr the XHR.
 * @param textStatus the error status as text.
 *
 * @return the normalized error.
 */
function normalizeError(xhr, textStatus) {
  var error = null;

  try {
    error = JSON.parse(xhr.responseText);
    if(error.type === undefined) {
      error.type = 'website.Exception';
      error.message = 'An error occurred while communicating with ' +
        'the server: ' + textStatus;
    }
    // check for invalid session or missing session
    else if(error.type === 'payswarm.website.PermissionDenied') {
      // redirect to login
      // FIXME: support modal login to keep current state vs forced redirect
      window.location = '/profile/login?ref=' +
        encodeURIComponent(window.location.pathname) +
        '&expired=true';
    }
  }
  catch(e) {
    // not a json-formatted exception
    error = {
      type: 'website.Exception',
      message: 'An error occurred while communicating with ' +
        'the server: ' + textStatus
    };
  }
  return error;
}

})(jQuery);
