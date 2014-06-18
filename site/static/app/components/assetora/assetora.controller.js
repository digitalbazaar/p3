/*!
 * Assetora
 *
 * @author Dave Longley
 */
define(['angular'], function(angular) {

var deps = ['$scope', 'svcHostedAsset', 'svcHostedListing', '$timeout'];
return {
  controller: {AssetoraCtrl: deps.concat(factory)},
  routes: [{
    path: '/i/:identity/assetora',
    options: {
      templateUrl: '/app/templates/tools/assetora.html',
      controller: 'AssetoraCtrl'
    }
  }]
};

function factory($scope, svcHostedAsset, svcHostedListing, $timeout) {
  $scope.model = {};
  // FIXME: globalize window.data access
  var data = window.data || {};
  $scope.identity = data.identity;
  $scope.model.recentAssets = svcHostedAsset.recentAssets;
  $scope.model.recentListings = svcHostedListing.recentListings;
  $scope.state = {
    assets: svcHostedAsset.state,
    listings: svcHostedListing.state
  };
  $scope.model.search = {input: '', assets: [], listings: []};
  $scope.model.modals = {
    asset: null,
    listing: null,
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
        svcHostedAsset.del(asset.id, function(err) {
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
        svcHostedListing.del(listing.id, function(err) {
          if(err) {
            listing.deleted = false;
          }
        });
      }, 400);
    }
    $scope.listingToDelete = null;
  };
  $scope.search = function(input, state, callback) {
    if(input.length === 0) {
      $scope.model.search.assets.splice(
        0, $scope.model.search.assets.length);
      $scope.model.search.listings.splice(
        0, $scope.model.search.listings.length);
      return;
    }

    // FIXME: remove me
    console.log('search', input, state);

    // FIXME: have toggle for searching assets vs. listings, kinda messy ...
    // would be better to just have search results return assets and listings
    // together?

    // search listings for input as keywords
    svcHostedAsset.get({
      storage: $scope.model.search.assets,
      keywords: $scope.model.search.input
    }, function(err) {
      if(err) {
        state.error = err;
      } else {
        state.error = null;
      }
      callback();
    });
    svcHostedListing.get({
      storage: $scope.model.search.listings,
      keywords: $scope.model.search.input
    }, function(err) {
      if(err) {
        state.error = err;
      } else {
        state.error = null;
      }
      callback();
    });
  };

  svcHostedAsset.getRecent({force: true});
  svcHostedListing.getRecent({force: true});
}

});
