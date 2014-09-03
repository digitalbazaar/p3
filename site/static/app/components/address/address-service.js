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
  brIdentityService, brModelService, brRefreshService, brResourceService) {
  var service = {};

  // create address collection
  var identity = brIdentityService.identity;
  service.collection = new brResourceService.Collection({
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
    brModelService.replaceArray(identity.address, service.addresses);
  }

  // register for system-wide refreshes
  brRefreshService.register(service.collection);

  // expose service to scope
  $rootScope.app.services.address = service;

  return service;
}

return {AddressService: factory};

});
