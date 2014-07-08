/*!
 * Content Portal Controller.
 *
 * @author Dave Longley
 */
define([], function() {

var deps = ['$scope'];
return {ContentPortalController: deps.concat(factory)};

function factory($scope) {
  $scope.model = {};
  // FIXME: globalize window.data access
  var data = window.data || {};
  $scope.model = {
    asset: data.asset,
    encryptedReceipt: data.encryptedReceipt
  };
}

});
