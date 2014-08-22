/*!
 * PaySwarm Address Service.
 *
 * @author Dave Longley
 */
define([], function() {

'use strict';

/* @ngInject */
function factory(
  $http, $rootScope, $timeout,
  IdentityService, ModelService, RefreshService, ResourceService) {
  var service = {};

  // create address collection
  var identity = IdentityService.identity;
  service.collection = new ResourceService.Collection({
    url: identity.id + '/addresses',
    finishLoading: _updateAddresses
  });
  service.state = service.collection.state;
  service.addresses = service.collection.storage;

  // validate an address
  service.validate = function(address) {
    return service.collection.add(address, {
      params: {action: 'validate'},
      update: false
    });
  };

  function _updateAddresses() {
    // update identity addresses
    ModelService.replaceArray(identity.address, service.addresses);
  }

  // register for system-wide refreshes
  RefreshService.register(service.collection);

  // expose service to scope
  $rootScope.app.services.address = service;

  return service;
}

return {AddressService: factory};

});
