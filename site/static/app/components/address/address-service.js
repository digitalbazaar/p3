/*!
 * PaySwarm Address Service.
 *
 * @author Dave Longley
 */
define(['angular'], function(angular) {

var deps = [
  '$timeout', '$rootScope',
  'IdentityService', 'ModelService', 'RefreshService'];
return {AddressService: deps.concat(factory)};

function factory(
  $timeout, $rootScope,
  IdentityService, ModelService, RefreshService) {
  var service = {};

  function _entry(identityId) {
    if(!(identityId in service.identities)) {
      service.identities[identityId] = {
        addresses: [],
        expires: 0
      };
    }
    return service.identities[identityId];
  }

  var identity = IdentityService.identity;
  var maxAge = 1000*60*2;
  service.identities = {};
  service.addresses = _entry(identity.id).addresses;
  service.state = {
    loading: false
  };

  // get all addresses for an identity
  service.get = function(options, callback) {
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || angular.noop;
    var identityId = options.identity || identity.id;

    var entry = _entry(identityId);
    if(options.force || +new Date() >= entry.expires) {
      service.state.loading = true;
      $timeout(function() {
        payswarm.addresses.get({
          identity: identityId,
          success: function(addresses) {
            ModelService.replaceArray(entry.addresses, addresses, 'label');
            entry.expires = +new Date() + maxAge;
            service.state.loading = false;
            callback(null, entry.addresses);
            $rootScope.$apply();
          },
          error: function(err) {
            service.state.loading = false;
            callback(err);
            $rootScope.$apply();
          }
        });
      }, options.delay || 0);
    } else {
      $timeout(function() {
        callback(null, entry.addresses);
      });
    }
  };

  // validate an address
  service.validate = function(address, callback) {
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.addresses.validate({
      identity: identity.id,
      address: address,
      success: function(validated) {
        service.state.loading = false;
        callback(null, validated);
        $rootScope.$apply();
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
        $rootScope.$apply();
      }
    });
  };

  // add a new address
  service.add = function(address, identityId, callback) {
    if(typeof identityId === 'function') {
      callback = identityId;
      identityId = identity.id;
    }
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.addresses.add({
      identity: identityId,
      address: address,
      success: function(address) {
        var entry = _entry(identityId);
        entry.addresses.push(address);
        if(identityId === identity.id) {
          identity.address.push(address);
        }
        // FIXME: create and/or push to
        //   IdentityService.identityMap[identityId].address?
        service.state.loading = false;
        callback(null, address);
        $rootScope.$apply();
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
        $rootScope.$apply();
      }
    });
  };

  // delete an address by label
  service.del = function(address, callback) {
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.addresses.del({
      identity: identity.id,
      addressId: address.label,
      success: function() {
        ModelService.removeFromArray(address.label, service.addresses, 'label');
        ModelService.removeFromArray(address.label, identity.address, 'label');
        service.state.loading = false;
        callback();
        $rootScope.$apply();
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
        $rootScope.$apply();
      }
    });
  };

  // FIXME:
  // register for system-wide refreshes
  //RefreshService.register(...);

  // expose service to scope
  $rootScope.app.services.address = service;

  return service;
}

});
