/*!
 * Causes
 *
 * @author Digital Bazaar, Inc.
 */
define(['angular'], function(angular) {

var deps = ['$scope', 'svcHostedAsset', 'svcHostedListing', '$timeout'];
return {
  controller: {CausesCtrl: deps.concat(factory)},
  routes: [{
    path: '/i/:identity/causes',
    options: {
      templateUrl: '/app/components/assetora/causes.html',
      controller: 'CausesCtrl'
    }
  }]
};

function factory($scope, svcHostedAsset, svcHostedListing, $timeout) {
  $scope.model = {};
  // FIXME: globalize window.data access
  var data = window.data || {};
  $scope.identity = data.identity;
}

});
