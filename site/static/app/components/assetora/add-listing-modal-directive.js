/*!
 * Add Listing Modal.
 *
 * @author Dave Longley
 */
define([], function() {

var deps = ['AlertService', 'HostedListingService', 'ModalService', 'config'];
return {addListingModal: deps.concat(factory)};

function factory(AlertService, HostedListingService, ModalService, config) {
  function Ctrl($scope) {
    // FIXME: use root/global data, move over to model
    $scope.data = config.data || {};
    $scope.identity = config.data.identity || {};
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
      listing.sysPublished = window.iso8601.w3cDate();

      console.log('listing', listing);
      listing.asset = $scope.asset.id;
      HostedListingService.add(listing).then(function(listing) {
        $scope.loading = false;
        $scope.modal.close(null, listing);
      }).catch(function(err) {
        AlertService.add('error', err);
        $scope.loading = false;
      });
    };
  }

  return ModalService.directive({
    name: 'addListing',
    scope: {
      asset: '='
    },
    templateUrl: '/app/components/assetora/add-listing-modal.html',
    controller: ['$scope', Ctrl],
    link: function(scope, element, attrs) {
      scope.feedbackTarget = element;
    }
  });
}

});
