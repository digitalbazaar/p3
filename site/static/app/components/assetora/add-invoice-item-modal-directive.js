/*!
 * Add Invoice Item Modal.
 *
 * @author David I. Lehn
 */
define([], function() {

'use strict';

/* @ngInject */
function factory(config) {
  return {
    restrict: 'A',
    scope: {
      asset: '=psAsset',
      destination: '=psDestination'
    },
    require: '^stackable',
    templateUrl: requirejs.toUrl('p3/components/add-invoice-item-modal.html'),
    link: Link
  };

  function Link(scope, element, attrs, stackable) {
    // FIXME: use root/global data, move over to model
    scope.data = config.data || {};
    scope.identity = config.data.identity || {};

    console.log('modal-add-invoice-item scope.asset', scope.asset);
    console.log('modal-add-invoice-item scope', scope);
    scope.model = {};
    scope.model.loading = false;
    scope.model.asset = scope.asset;
    scope.model.item = {
      // @context set in parent Invoice
      type: 'InvoiceItem',
      title: '',
      amount: '',
      currency: scope.destination.currency,
      comment: ''
      // FIXME: add more item details
      // - date range of item
      // - time used for item
      // - who performed item
      // ... etc
    };

    scope.addInvoiceItem = function() {
      var item = scope.model.item;
      scope.model.asset.invoiceItem.push(item);
      stackable.close(null, item);
    };
  }
}

return {psAddInvoiceItemModal: factory};

});
