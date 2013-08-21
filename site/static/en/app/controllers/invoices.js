/*!
 * Invoices
 *
 * @author Digital Bazaar, Inc.
 */
define(['angular'], function(angular) {

var deps = ['$scope', 'svcHostedAsset', 'svcHostedListing', '$timeout'];
return {
  controller: {InvoicesCtrl: deps.concat(factory)},
  routes: [{
    path: '/i/:identity/invoices',
    options: {
      templateUrl: '/partials/tools/invoices.html',
      controller: 'InvoicesCtrl'
    }
  }]
};

function factory($scope, svcHostedAsset, svcHostedListing, $timeout) {
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

});
