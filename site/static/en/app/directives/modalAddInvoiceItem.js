/*!
 * Add Invoice Item Modal.
 *
 * @author David I. Lehn
 */
define(['angular', 'payswarm.api'], function(angular, payswarm) {

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
      '@context': [
        'https://w3id.org/payswarm/v1',
        //'https://w3id.org/meritora/v1',
        {
          'meritora': 'https://w3id.org/meritora#',
          'invoice': 'https://w3id.org/meritora/invoice#',
          'Invoice': 'invoice:Invoice',
          'Item': 'invoice:Item',
          // FIXME: use @container: @list?
          'invoiceItem': 'invoice:item'
        }
      ],
      type: 'Item',
      label: '',
      comment: '',
      amount: ''
      // FIXME: add more item details
      // - date range of item
      // - time used for item
      // - who performed item
      // - item comment
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
      asset: '='
    },
    templateUrl: '/partials/modals/add-invoice-item.html',
    controller: ['$scope', Ctrl],
    link: function(scope, element, attrs) {
      scope.feedbackTarget = element;
    }
  });
}

});
