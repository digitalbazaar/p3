/*!
 * Identity Settings
 *
 * @author Dave Longley
 */
// FIXME: use RequireJS AMD format
(function() {

var module = angular.module('payswarm');

module.controller('SettingsCtrl', function($scope) {
});

module.controller('ExternalAccountsCtrl', function($scope, svcPaymentToken) {
  $scope.state = svcPaymentToken.state;

  // types for UI directives
  $scope.allMethods = ['CreditCard', 'BankAccount'];
  $scope.creditCardMethods = ['CreditCard'];
  $scope.bankAccountMethods = ['BankAccount'];

  // service data
  $scope.creditCards = svcPaymentToken.creditCards;
  $scope.bankAccounts = svcPaymentToken.bankAccounts;

  // modals
  $scope.modals = {
    showAddCreditCard: false,
    showAddBankAccount: false
  };

  $scope.deletePaymentToken = function(paymentToken) {
    svcPaymentToken.del(paymentToken.id, function(err) {
      if(err) {
        paymentToken.deleted = false;
      }
    });
  };
  $scope.restorePaymentToken = function(paymentToken) {
    svcPaymentToken.restore(paymentToken.id);
  };

  svcPaymentToken.get();
});

module.controller('AddressCtrl', function($scope, svcAddress, svcIdentity) {
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
});

module.controller('KeyCtrl', function($scope, svcKey) {
  $scope.state = svcKey.state;
  $scope.keys = svcKey.keys;
  $scope.modals = {
    showEditKey: false,
    showRevokeKeyAlert: false,
    key: null
  };

  $scope.editKey = function(key) {
    $scope.modals.showEditKey = true;
    $scope.modals.key = key;
  };
  $scope.revokeKey = function(key) {
    $scope.modals.showRevokeKeyAlert = true;
    $scope.modals.key = key;
  };
  $scope.confirmRevokeKey = function(err, result) {
    if(!err && result === 'ok') {
      svcKey.revoke($scope.modals.key);
    }
    $scope.modals.key = null;
  };

  svcKey.get();
});

})();
