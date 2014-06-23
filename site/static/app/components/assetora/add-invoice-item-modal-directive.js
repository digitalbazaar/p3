/*!
 * Add Invoice Item Modal.
 *
 * @author David I. Lehn
 */
define([], function() {

var deps = ['svcModal'];
return {modalAddInvoiceItem: deps.concat(factory)};

function factory(svcModal) {
  function Ctrl($scope) {
    // FIXME: use root/global data, move over to model
    $scope.data = window.data || {};
    $scope.identity = data.identity || {};
    $scope.feedback = {};

    console.log('modal-add-invoice-item $scope.asset', $scope.asset);
    console.log('modal-add-invoice-item $scope', $scope);
    $scope.model = {};
    $scope.model.loading = false;
    $scope.model.asset = $scope.asset;
    $scope.model.item = {
      // @context set in parent Invoice
      type: 'InvoiceItem',
      title: '',
      amount: '',
      currency: $scope.destination.currency,
      comment: ''
      // FIXME: add more item details
      // - date range of item
      // - time used for item
      // - who performed item
      // ... etc
    };

    $scope.addInvoiceItem = function() {
      var item = $scope.model.item;
      $scope.model.asset.invoiceItem.push(item);
      $scope.modal.close(null, item);
    };
  }

  return svcModal.directive({
    name: 'AddInvoiceItem',
    scope: {
      asset: '=',
      destination: '='
    },
    templateUrl: '/app/components/add-invoice-item-modal.html',
    controller: ['$scope', Ctrl],
    link: function(scope, element, attrs) {
      scope.feedbackTarget = element;
    }
  });
}

});
