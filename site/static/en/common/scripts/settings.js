/*!
 * Identity Settings
 *
 * @author Dave Longley
 */
// FIXME: use RequireJS AMD format
(function() {

var module = angular.module('settings', ['payswarm']);

module.controller('SettingsCtrl', function($scope) {
  // initialize model
  var data = window.data || {};
  $scope.session = data.session || null;
  $scope.identity = data.identity || null;
});

module.controller('ExternalAccountsCtrl', function($scope) {
  $scope.creditCards = [];
  $scope.bankAccounts = [];
  $scope.loading = false;

  $scope.addToken = function() {
    window.modals.addPaymentToken.show({
      identity: $scope.identity,
      added: function() {
        updateTokens($scope);
      }
    });
  };

  updateTokens($scope);
});

module.controller('AddressCtrl', function($scope) {
  $scope.addresses = [];
  $scope.loading = false;

  $scope.addAddress = function() {
    window.modals.addAddress.show({
      identity: $scope.identity,
      added: function(address) {
        $scope.addresses.push(address);
      }
    });
  };

  updateAddresses($scope);
});

function updateTokens($scope) {
  payswarm.paymentTokens.get({
    identity: $scope.identity,
    success: function(paymentTokens) {
      $scope.creditCards = [];
      $scope.bankAccounts = [];
      angular.forEach(paymentTokens, function(token) {
        if(token.paymentMethod === 'ccard:CreditCard') {
          $scope.creditCards.push(token);
        }
        else if(token.paymentMethod === 'bank:BankAccount') {
          $scope.bankAccounts.push(token);
        }
      });
      $scope.$apply();
    },
    error: function(err) {
      console.error('updateTokens:', err);
      $scope.$apply();
    }
  });
}

function updateAddresses($scope) {
  payswarm.addresses.get({
    identity: $scope.identity,
    success: function(addresses) {
      $scope.addresses = addresses;
      console.log('addresses', addresses);
      $scope.$apply();
    },
    error: function(err) {
      console.error('updateAddresses:', err);
      $scope.$apply();
    }
  });
}

})();
