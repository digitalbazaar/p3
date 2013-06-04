/*!
 * Content Portal
 *
 * @author Dave Longley
 */
(function() {

var module = angular.module('payswarm');

module.controller('ContentPortalCtrl', function($scope) {
  $scope.model = {};
  // FIXME: globalize window.data access
  var data = window.data || {};
  $scope.model = {
    asset: data.asset,
    encryptedReceipt: data.encryptedReceipt
  };
});

})();
