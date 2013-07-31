/*!
 * Assetora
 *
 * @author Dave Longley
 */
(function() {

'use strict';

var module = angular.module('payswarm');

module.config(function($locationProvider, $routeProvider) {
  $locationProvider.html5Mode(true);
  $locationProvider.hashPrefix('!');
  $routeProvider
    .when('/i/:identity/tools', {
      templateUrl: '/partials/tools/tools.html' 
    })
    .when('/i/:identity/assetora', {
      templateUrl: '/partials/tools/assetora.html', 
      controller: AssetoraCtrl
    })
    .when('/i/:identity/bills', {
      templateUrl: '/partials/tools/bills.html', 
      controller: BillsCtrl
    })
    .when('/i/:identity/causes', {
      templateUrl: '/partials/tools/causes.html', 
      controller: CausesCtrl
    })
    .when('/i/:identity/tickets', {
      templateUrl: '/partials/tools/tickets.html', 
      controller: TicketsCtrl
    })
    .otherwise({
      redirectTo: function(params, path, search) {
        window.location.href = path;
      }
    });
});

function AssetoraCtrl($scope, svcHostedAsset, svcHostedListing) {
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
      }
      else {
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
      }
      else {
        state.error = null;
      }
      callback();
    });
  };

  svcHostedAsset.getRecent({force: true});
  svcHostedListing.getRecent({force: true});
}

function BillsCtrl($scope, svcHostedAsset, svcHostedListing) {
  $scope.model = {};
  // FIXME: globalize window.data access
  var data = window.data || {};
  $scope.identity = data.identity;
}

function CausesCtrl($scope, svcHostedAsset, svcHostedListing) {
  $scope.model = {};
  // FIXME: globalize window.data access
  var data = window.data || {};
  $scope.identity = data.identity;
}

function TicketsCtrl($scope, svcHostedAsset, svcHostedListing) {
  $scope.model = {};
  // FIXME: globalize window.data access
  var data = window.data || {};
  $scope.identity = data.identity;
}

})();
