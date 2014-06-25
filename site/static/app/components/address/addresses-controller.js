/*!
 * Addresses Controller.
 *
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 * @author David I. Lehn
 */
define([], function() {

var deps = ['$scope', 'AddressService', 'IdentityService'];
return {AddressesController: deps.concat(factory)};

function factory($scope, AddressService, IdentityService) {
  var self = this;
  self.identity = IdentityService.identity;
  self.state = AddressService.state;
  self.addresses = AddressService.addresses;
  self.addressToDelete = null;
  self.modals = {
    showAddAddress: false,
    showLastAddressAlert: false
  };

  function callback(err) {
    // FIXME: show errors
    //$scope.feedback.error = err;
  }

  self.deleteAddress = function(address) {
    if(AddressService.addresses.length === 1) {
      self.showLastAddressAlert = true;
      self.addressToDelete = address;
    } else {
      AddressService.del(address, callback);
    }
  };
  self.confirmDeleteAddress = function(err, result) {
    // FIXME: handle errors
    if(!err && result === 'ok') {
      AddressService.del(self.addressToDelete, function(err) {
        callback(err);
      });
    }
    self.addressToDelete = null;
  };

  function refresh(force) {
    var opts = {force: !!force};
    AddressService.get(opts);
  }
  $scope.$on('refreshData', function() {
    refresh(true);
  });
  refresh();
}

});
