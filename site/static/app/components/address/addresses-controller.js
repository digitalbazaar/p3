/*!
 * Addresses Controller.
 *
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 * @author David I. Lehn
 */
define([], function() {

'use strict';

/* @ngInject */
function factory($scope, AddressService, AlertService, IdentityService) {
  var self = this;
  self.identity = IdentityService.identity;
  self.state = AddressService.state;
  self.addresses = AddressService.addresses;
  self.addressToDelete = null;
  self.modals = {
    showAddAddress: false,
    showDeleteAddressAlert: false
  };

  self.deleteAddress = function(address) {
    self.modals.showDeleteAddressAlert = true;
    self.addressToDelete = address;
  };
  self.confirmDeleteAddress = function(err, result) {
    if(!err && result === 'ok') {
      AddressService.del(self.addressToDelete).catch(function(err) {
        AlertService.add('error', err);
        $scope.$apply();
      });
    }
    self.addressToDelete = null;
  };

  AddressService.getAll();
}

return {AddressesController: factory};

});
