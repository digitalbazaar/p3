/*!
 * Add Invoice Modal.
 *
 * @author David I. Lehn
 */
define(['angular'], function(angular) {

'use strict';

/* @ngInject */
function factory(brAlertService, psHostedAssetService, config, util) {
  return {
    restrict: 'A',
    scope: {},
    require: '^stackable',
    templateUrl: '/app/components/assetora/add-invoice-modal.html',
    link: Link
  };

  function Link(scope, element, attrs, stackable) {
    // FIXME: use root/global data, move over to model
    scope.data = config.data || {};
    scope.identity = config.data.identity || {};

    scope.model = {};
    scope.model.loading = false;
    scope.model.asset = {
      '@context': [
        'https://w3id.org/payswarm/v1',
        'https://w3id.org/meritora/v1'
      ],
      type: ['Asset', 'Invoice'],
      // FIXME: add more asset details
      // FIXME: remove test data
      title: '',
      creator: {name: scope.identity.label},
      assetProvider: scope.identity.id,
      listingRestrictions: {vendor: scope.identity.id},
      //assetContent: null,
      invoiceItem: [],
      // FIXME: figure out whether published flag is desirable
      sysPublished: null,
      created: null
    };
    scope.model.destination = null;

    scope.addInvoice = function() {
      var asset = scope.model.asset;
      // FIXME: where should angular $$xxx property removal go?
      asset = JSON.parse(angular.toJson(asset));
      asset.created = util.w3cDate();
      asset.sysPublished = asset.created;

      console.log('invoice asset', asset);
      psHostedAssetService.add(asset, function(err, asset) {
        scope.loading = false;
        if(!err) {
          stackable.close(null, asset);
        } else {
          brAlertService.add('error', err, {scope: scope});
        }
      });
      // FIXME: create and add associated Listing
    };
  }
}

return {psAddInvoiceModal: factory};

});
