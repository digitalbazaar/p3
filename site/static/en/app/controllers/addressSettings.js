/*!
 * Address Settings Controller.
 *
 * @author Dave Longley
 */
(function() {

define([], function() {

var name = 'AddressSettingsCtrl';
var deps = ['$scope', 'svcAddress', 'svcIdentity'];
var factory = function($scope, svcAddress, svcIdentity) {
  $scope.identity = svcIdentity.identity;
  $scope.state = svcAddress.state;
  $scope.addresses = svcAddress.addresses;
  $scope.addressToDelete = null;
  $scope.modals = {
    showAddAddress: false
  };

  function callback(err) {
    // FIXME: show errors
    //$scope.feedback.error = err;
  }

  $scope.deleteAddress = function(address) {
    if(svcAddress.addresses.length === 1) {
      $scope.showLastAddressAlert = true;
      $scope.addressToDelete = address;
    }
    else {
      svcAddress.del(address, callback);
    }
  };
  $scope.confirmDeleteAddress = function(err, result) {
    // FIXME: handle errors
    if(!err && result === 'ok') {
      svcAddress.del($scope.addressToDelete, function(err) {
        callback(err);
      });
    }
    $scope.addressToDelete = null;
  };

  svcAddress.get();
};

return {name: name, deps: deps, factory: factory};
});

})();
