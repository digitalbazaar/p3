/*!
 * Add Listing Modal.
 *
 * @author Dave Longley
 */
define(['async'], function(async) {

var deps = ['svcModal'];
return {modalAddListing: deps.concat(factory)};

function factory(svcModal) {
  function Ctrl($scope, svcHostedAsset, svcHostedListing) {
    // FIXME: use root/global data, move over to model
    $scope.data = window.data || {};
    $scope.identity = $scope.data.identity || {};
    $scope.feedback = {};

    $scope.model = {};
    $scope.model.loading = false;
    $scope.model.asset = $scope.asset;
    $scope.model.listing = {
      '@context': 'https://w3id.org/payswarm/v1'
    };
    $scope.model.destination = null;

    $scope.addListing = function() {
      // FIXME: add more listing details
      // FIXME: remove test data
      var listing = $scope.model.listing;
      listing.type = ['Listing', 'gr:Offering'];
      listing.vendor = $scope.identity.id;
      listing.payee = [{
        type: 'Payee',
        destination: $scope.model.destination.id,
        currency: 'USD',
        payeeGroup: ['vendor'],
        payeeRate: '0.05', //$scope.model.total,
        payeeRateType: 'FlatAmount',
        payeeApplyType: 'ApplyExclusively',
        comment: 'Price for ' + $scope.asset.title
      }];
      listing.payeeRule = [{
        type: 'PayeeRule',
        payeeGroupPrefix: ['authority'],
        maximumPayeeRate: '2.0000000000',
        payeeRateType: 'Percentage',
        payeeApplyType: 'ApplyInclusively'
      }];
      // FIXME: make configurable, provide combo box options and for
      // advanced users, provide custom URL + use license caching service
      // to get hash
      listing.license = 'https://w3id.org/payswarm/licenses/blogging';
      listing.licenseHash = 'urn:sha256:' +
        'd9dcfb7b3ba057df52b99f777747e8fe0fc598a3bb364e3d3eb529f90d58e1b9';
      // FIXME: figure out whether published flag is desirable
      listing.psaPublished = window.iso8601.w3cDate();

      async.waterfall([
        function(callback) {
          console.log('listing', listing);
          listing.asset = $scope.asset.id;
          svcHostedListing.add(listing, callback);
        }
      ], function(err, listing) {
        $scope.loading = false;
        if(!err) {
          $scope.modal.close(null, listing);
        }
        $scope.feedback.error = err;
      });
    };
  }

  return svcModal.directive({
    name: 'AddListing',
    scope: {
      asset: '='
    },
    templateUrl: '/partials/modals/add-listing.html',
    controller: Ctrl,
    link: function(scope, element, attrs) {
      scope.feedbackTarget = element;
    }
  });
}

});
