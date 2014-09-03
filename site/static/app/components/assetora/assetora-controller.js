/*!
 * Assetora
 *
 * @author Dave Longley
 */
define([], function() {

'use strict';

/* @ngInject */
function factory(
  $scope, brAlertService, config,
  psHostedAssetService, psHostedListingService) {
  $scope.model = {};
  $scope.identity = config.data.identity;
  $scope.model.recentAssets = psHostedAssetService.recentAssets;
  $scope.model.recentListings = psHostedListingService.recentListings;
  $scope.state = {
    assets: psHostedAssetService.state,
    listings: psHostedListingService.state
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
      psHostedAssetService.collection.del(asset.id, {delay: 400})
        .catch(function(err) {
          brAlertService.add('error', err);
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
      psHostedListingService.del(listing.id, {delay: 400})
        .catch(function(err) {
          brAlertService.add('error', err);
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
      psHostedAssetService.get({
        storage: $scope.model.search.assets,
        keywords: $scope.model.search.input
      }).catch(function(err) {
        brAlertService.add('error', err);
      }),
      psHostedListingService.get({
        storage: $scope.model.search.listings,
        keywords: $scope.model.search.input
      }).catch(function(err) {
        brAlertService.add('error', err);
      })
    ]);
  };

  psHostedAssetService.query();
  psHostedListingService.query();
}

return {AssetoraController: factory};

});
