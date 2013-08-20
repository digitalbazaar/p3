/*!
 * Assetora
 *
 * @author Dave Longley
 */
define(['angular'], function(angular) {

var deps = ['$scope', 'svcHostedAsset', 'svcHostedListing', '$timeout'];
return {AssetoraCtrl: deps.concat(factory)};

// FIXME: separate routes into own file/do this elsewhere?
/*var module = angular.module('app');
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
    .when('/i/:identity/invoices', {
      templateUrl: '/partials/tools/invoices.html',
      controller: InvoicesCtrl
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
});*/

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

// FIXME: move to separate file
function InvoicesCtrl($scope, svcHostedAsset, svcHostedListing) {
  $scope.model = {};
  // FIXME: globalize window.data access
  var data = window.data || {};
  $scope.identity = data.identity;
  $scope.model.recentAssets = svcHostedAsset.recentAssets;
  $scope.state = {
    assets: svcHostedAsset.state
  };
  $scope.model.search = {input: '', assets: []};
  $scope.model.modals = {
    asset: null,
    item: null,
    showAddInvoice: false,
    showEditInvoice: false,
    showAddInvoiceItem: false,
    showEditInvoiceItem: false
  };
  $scope.deleteInvoice = function(invoice) {
    $scope.showDeleteInvoiceAlert = true;
    $scope.invoiceToDelete = invoice;
  };
  $scope.confirmDeleteInvoice = function(err, result) {
    // FIXME: handle errors
    if(!err && result === 'ok') {
      var invoice = $scope.invoiceToDelete;
      invoice.deleted = true;

      // wait to delete so modal can transition
      $timeout(function() {
        svcAsset.del(asset.id, function(err) {
          if(err) {
            asset.deleted = false;
          }
        });
        // FIXME: delete related listing
      }, 400);
    }
    $scope.assetToDelete = null;
  };
  $scope.search = function(input, state, callback) {
    if(input.length === 0) {
      $scope.model.search.assets.splice(
        0, $scope.model.search.assets.length);
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
  };

  svcHostedAsset.getRecent({force: true});
}

// FIXME: move to separate file
function CausesCtrl($scope, svcHostedAsset, svcHostedListing) {
  $scope.model = {};
  // FIXME: globalize window.data access
  var data = window.data || {};
  $scope.identity = data.identity;
}

// FIXME: move to separate file
function TicketsCtrl($scope, svcHostedAsset, svcHostedListing) {
  $scope.model = {};
  // FIXME: globalize window.data access
  var data = window.data || {};
  $scope.identity = data.identity;
}

});
