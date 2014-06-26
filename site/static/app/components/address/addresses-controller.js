/*!
 * Addresses Controller.
 *
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 * @author David I. Lehn
 */
define([], function() {

var deps = ['AddressService', 'AlertService', 'IdentityService'];
return {AddressesController: deps.concat(factory)};

function factory(AddressService, AlertService, IdentityService) {
  var self = this;
  self.identity = IdentityService.identity;
  self.state = AddressService.state;
  self.addresses = AddressService.addresses;
  self.addressToDelete = null;
  self.modals = {
    showAddAddress: false,
    showLastAddressAlert: false
  };

  self.deleteAddress = function(address) {
    // FIXME: always show a confirm modal ... but only show a warning in
    // the confirm modal for last address when applicable
    if(AddressService.addresses.length === 1) {
      self.showLastAddressAlert = true;
      self.addressToDelete = address;
    } else {
      AddressService.del(address).catch(function(err) {
        AlertService.add('error', err);
      });
    }
  };
  self.confirmDeleteAddress = function(err, result) {
    if(!err && result === 'ok') {
      AddressService.del(self.addressToDelete).catch(function(err) {
        AlertService.add('error', err);
      });
    }
    self.addressToDelete = null;
  };

  AddressService.getAll();
}

});
