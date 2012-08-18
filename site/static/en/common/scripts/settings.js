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
});

module.controller('AddressCtrl', function($scope) {
  $scope.creditCards = [];
  $scope.bankAccounts = [];
  $scope.loading = false;
});

})();
