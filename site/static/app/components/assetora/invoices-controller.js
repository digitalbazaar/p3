/*!
 * Invoices
 *
 * @author Digital Bazaar, Inc.
 */
define([], function() {

'use strict';

/* @ngInject */
function factory($scope, AlertService, HostedAssetService) {
  $scope.model = {};
  // FIXME: globalize window.data access
  var data = window.data || {};
  $scope.identity = data.identity;
  $scope.state = {
    assets: HostedAssetService.state
  };
  $scope.model.search = {
    input: '',
    assets: []
  };
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
      var asset = $scope.model.modals.asset;
      HostedAssetService.del(asset.id, {delay: 400}).catch(function(err) {
        AlertService.add('error', err);
        asset.deleted = false;
        // FIXME: delete related listing
      });
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
    HostedAssetService.query({
      storage: $scope.model.search.assets,
      keywords: $scope.model.search.input
    }).catch(function(err) {
      AlertService.add('error', err);
    });
  };

  HostedAssetService.query({
    // FIXME
    limit: 10,
    type: 'Invoice',
    storage: $scope.model.search.assets
  });
}

return {InvoicesController: factory};

});
