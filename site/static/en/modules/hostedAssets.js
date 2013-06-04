/*!
 * Hosted Assets
 *
 * @author Dave Longley
 */
(function() {

var module = angular.module('payswarm');

module.controller('HostedAssetsCtrl', function(
  $scope, svcHostedAsset, svcHostedListing) {
  $scope.model = {};
  // FIXME: globalize window.data access
  var data = window.data || {};
  $scope.model.query = data.query;
  $scope.model.assets = [];
  $scope.model.loading = false;
  $scope.model.error = null;

  // search listings for input as keywords
  // FIXME: remove hard-coded assetContent
  data.query.assetContent = 'https://payswarm.com';
  var options = angular.extend({}, data.query, {
    identity: data.identityId,
    storage: $scope.model.assets
  });
  svcHostedAsset.get(options, function(err) {
    $scope.model.error = err;
    $scope.model.loading = true;
    $scope.$apply();
  });
});

})();
