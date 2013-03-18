/*!
 * Assetora
 *
 * @author Dave Longley
 */
(function() {

var module = angular.module('payswarm');

module.controller('AssetoraCtrl', function($scope) {
  $scope.model = {};
  // FIXME: globalize window.data access
  var data = window.data || {};
  $scope.identity = data.identity;
  $scope.modals = {
    showEditAsset: false,
    showAddAsset: false,
    showEditListing: false,
    showAddListing: false
  };
  $scope.deleteAsset = function(asset) {
    $scope.showDeleteAssetAlert = true;
    $scope.assetToDelete = asset;
  };
  $scope.confirmDeleteAsset = function(err, result) {
    // FIXME: handle errors
    if(!err && result === 'ok') {
      var asset = $scope.assetToDelete;
      asset.deleted = true;

      // wait to delete so modal can transition
      $timeout(function() {
        svcAsset.del(asset.id, function(err) {
          if(err) {
            asset.deleted = false;
          }
        });
      }, 400);
    }
    $scope.assetToDelete = null;
  };
  $scope.deleteListing = function(listing) {
    $scope.showDeleteListingAlert = true;
    $scope.listingToDelete = listing;
  };
  $scope.confirmDeleteListing = function(err, result) {
    // FIXME: handle errors
    if(!err && result === 'ok') {
      var listing = $scope.listingToDelete;
      listing.deleted = true;

      // wait to delete so modal can transition
      $timeout(function() {
        svcListing.del(listing.id, function(err) {
          if(err) {
            listing.deleted = false;
          }
        });
      }, 400);
    }
    $scope.listingToDelete = null;
  };

  //svcAsset.get({force: true});
  //svcListing.get({force: true});
});

})();
