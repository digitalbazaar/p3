/*!
 * Hosted Assets.
 *
 * @author Dave Longley
 */
define(['angular', 'async'], function(angular, async) {

var deps = ['$scope', 'HostedAssetService', 'HostedListingService'];
return {HostedAssetsCtrl: deps.concat(factory)};

function factory($scope, HostedAssetService, HostedListingService) {
  $scope.model = {};
  // FIXME: globalize window.data access
  var data = window.data || {};
  $scope.model.query = data.query;
  $scope.model.assets = [];
  $scope.model.listings = {};
  $scope.model.table = [];
  $scope.model.loading = false;
  $scope.model.error = null;

  // search listings for input as keywords
  var options = angular.extend({}, data.query, {
    identity: data.identityId,
    storage: $scope.model.assets
  });
  $scope.model.loading = true;
  HostedAssetService.get(options, function(err) {
    $scope.model.error = err;
    $scope.model.loading = false;

    if(err) {
      return $scope.$apply();
    }

    $scope.model.table = [];
    angular.forEach($scope.model.assets, function(asset) {
      $scope.model.table.push({
        type: 'asset',
        asset: asset,
        loading: false,
        showListings: false
      });
    });

    $scope.$apply();
  });

  $scope.showListings = function(row) {
    // already loading listings for row
    if(row.loading) {
      return;
    }

    var asset = row.asset;
    row.showListings = !row.showListings;

    // hide listings
    if(!row.showListings) {
      // remove listing rows between target asset and next asset
      var rows = $scope.model.table;
      var count = 0;
      var start = rows.length;
      for(var i = 0; i < rows.length; ++i) {
        if(rows[i].type === 'asset' && rows[i].asset.id === asset.id) {
          start = i;
        } else if(i > start) {
          if(rows[i].type !== 'listing') {
            break;
          }
          ++count;
        }
      }
      rows.splice(start + 1, count);
      return;
    }

    // load listings to be shown
    row.loading = true;
    $scope.model.loading = true;
    async.waterfall([
      function(callback) {
        if(asset.id in $scope.model.listings) {
          return callback();
        }

        // get listings for asset
        var rows = [];
        var storage = [];
        $scope.model.listings[asset.id] = {
          listings: storage,
          rows: rows
        };
        HostedListingService.get({
          identity: data.identityId,
          storage: storage,
          includeAsset: false
        }, function(err) {
          $scope.model.error = err;
          if(!err) {
            // build listing rows
            angular.forEach(storage, function(listing) {
              // TODO: estimate price for listing
              var amount = listing.payee[0].payeeRate;

              // build purchase url for listing
              var purchaseUrl = data.purchaseUrl +
                '&listing=' + encodeURIComponent(listing.id) +
                '&listing-hash=' + encodeURIComponent(listing.sysListingHash) +
                '&callback=' +
                  encodeURIComponent(data.identityId) + '/receipts';
              rows.push({
                type: 'listing',
                listing: listing,
                title: row.asset.title,
                amount: amount,
                purchaseUrl: purchaseUrl
              });
            });
          }
          callback(err);
        });
      },
      function(callback) {
        // user turned off showing listings while they were still loading
        if(!row.showListings) {
          return callback();
        }

        // add listing rows for asset
        var rows = $scope.model.table;
        for(var i = 0; i < rows.length; ++i) {
          if(rows[i].type === 'asset' && rows[i].asset.id === asset.id) {
            rows.splice.bind(rows, i + 1, 0).apply(
              rows, $scope.model.listings[asset.id].rows);
            break;
          }
        }
        callback();
      }
    ], function(err) {
      $scope.model.error = err;
      row.loading = false;
      $scope.model.loading = false;
      $scope.$apply();
    });
  };
}

});
