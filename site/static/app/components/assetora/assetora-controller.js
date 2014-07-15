/*!
 * Assetora
 *
 * @author Dave Longley
 */
define([], function() {

'use strict'; 

/* @ngInject */
function factory(
  $scope, AlertService, HostedAssetService, HostedListingService, config) {
  $scope.model = {};
  $scope.identity = config.data.identity;
  $scope.model.recentAssets = HostedAssetService.recentAssets;
  $scope.model.recentListings = HostedListingService.recentListings;
  $scope.state = {
    assets: HostedAssetService.state,
    listings: HostedListingService.state
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
      HostedAssetService.collection.del(asset.id, {delay: 400})
        .catch(function(err) {
          AlertService.add('error', err);
          asset.deleted = false;
        });
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
      HostedListingService.del(listing.id, {delay: 400})
        .catch(function(err) {
          AlertService.add('error', err);
          listing.deleted = false;
        });
    }
    $scope.listingToDelete = null;
  };
  $scope.search = function(input, state) {
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
    return Promise.all([
      HostedAssetService.get({
        storage: $scope.model.search.assets,
        keywords: $scope.model.search.input
      }).catch(function(err) {
        AlertService.add('error', err);
      }),
      HostedListingService.get({
        storage: $scope.model.search.listings,
        keywords: $scope.model.search.input
      }).catch(function(err) {
        AlertService.add('error', err);
      })
    ]);
  };

  HostedAssetService.query();
  HostedListingService.query();
}

return {AssetoraController: factory};

});
