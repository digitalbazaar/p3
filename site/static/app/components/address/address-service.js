/*!
 * PaySwarm Address Service.
 *
 * @author Dave Longley
 */
define([], function() {

var deps = [
  '$http', '$rootScope', '$timeout',
  'IdentityService', 'ModelService', 'RefreshService'];
return {AddressService: deps.concat(factory)};

function factory(
  $http, $rootScope, $timeout,
  IdentityService, ModelService, RefreshService) {
  var service = {};

  var identity = IdentityService.identity;
  var maxAge = 1000*60*2;
  service.expires = 0;
  service.addresses = [];
  service.state = {
    loading: false
  };

  // get all addresses for an identity
  service.getAll = function(options) {
    options = options || {};
    if(options.force || Date.now() >= service.expires) {
      service.state.loading = true;
      return new Promise(function(resolve, reject) {
        $timeout(function() {
          Promise.resolve($http.get(identity.id + '/addresses'))
            .catch(function(err) {
              // if 404, assume no addresses
              if(err.status === 404) {
                err.data = [];
                return err;
              }
              reject(err);
            })
            .then(function(response) {
              var addresses = response.data;
              ModelService.replaceArray(service.addresses, addresses, 'label');
              service.expires = Date.now() + maxAge;
              service.state.loading = false;
              resolve(addresses);
            })
            .catch(function(err) {
              service.state.loading = false;
              reject(err);
            });
        }, options.delay || 0);
      });
    }
    return Promise.resolve(service.addresses);
  };

  // validate an address
  service.validate = function(address) {
    service.state.loading = true;
    Promise.resolve($http.post(identity.id + '/addresses', address, {
      params: {action: 'validate'}
    })).then(function(response) {
      service.state.loading = false;
      return response.data;
    }).catch(function(err) {
      service.state.loading = false;
      throw err;
    });
  };

  // add a new address
  service.add = function(address) {
    service.state.loading = true;
    Promise.resolve($http.post(identity.id + '/addresses', address))
      .then(function(response) {
        service.addresses.push(response.data);
        service.state.loading = false;
      })
      .catch(function(err) {
        service.state.loading = false;
        throw err;
      });
  };

  // delete an address by label
  service.del = function(address) {
    if(typeof address === 'string') {
      address = {label: address};
    }
    service.state.loading = true;
    Promise.resolve($http.delete(identity.id + '/addresses', {
      params: {addressId: address.label}
    })).then(function() {
      service.state.loading = false;
      ModelService.removeFromArray(address.label, service.addresses, 'label');
      ModelService.removeFromArray(address.label, identity.address, 'label');
    }).catch(function(err) {
      service.state.loading = false;
      throw err;
    });
  };

  // register for system-wide refreshes
  RefreshService.register(function() {
    service.getAll({force: true});
  });

  // expose service to scope
  $rootScope.app.services.address = service;

  return service;
}

});
