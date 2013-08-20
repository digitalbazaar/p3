/*!
 * Add Invoice Modal.
 *
 * @author David I. Lehn
 */
define(['angular', 'payswarm.api'], function(angular, payswarm) {

var deps = ['svcModal', 'svcHostedAsset', 'svcHostedListing'];
return {modalAddInvoice: deps.concat(factory)};

function factory(svcModal, svcHostedAsset, svcHostedListing) {
  function Ctrl($scope) {
    // FIXME: use root/global data, move over to model
    $scope.data = window.data || {};
    $scope.identity = data.identity || {};
    $scope.feedback = {};

    $scope.model = {};
    $scope.model.loading = false;
    $scope.model.asset = {
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
      type: ['Asset', 'Invoice'],
      // FIXME: add more asset details
      // FIXME: remove test data
      title: '',
      creator: {fullName: $scope.identity.label},
      assetProvider: $scope.identity.id,
      listingRestrictions: {vendor: $scope.identity.id},
      //assetContent: null,
      invoiceItem: [],
      // FIXME: figure out whether published flag is desirable
      psaPublished: null,
      created: null
    };
    $scope.model.destination = null;

    $scope.addInvoice = function() {
      var asset = $scope.model.asset;
      asset.created = window.iso8601.w3cDate();
      asset.psaPublished = asset.created;

      console.log('invoice asset', asset);
      svcHostedAsset.add(asset, function(err, asset) {
        $scope.loading = false;
        if(!err) {
          $scope.modal.close(null, asset);
        }
        $scope.feedback.error = err;
      });
      // FIXME: create and add associated Listing
    };
  }

  return svcModal.directive({
    name: 'AddInvoice',
    templateUrl: '/partials/modals/add-invoice.html',
    controller: ['$scope', Ctrl],
    link: function(scope, element, attrs) {
      scope.feedbackTarget = element;
    }
  });
}

});
