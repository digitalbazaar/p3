/*!
 * Add Listing Modal.
 *
 * @author Dave Longley
 */
define([], function() {

'use strict';

/* @ngInject */
function factory(brAlertService, psHostedListingService, config, util) {
  return {
    restrict: 'A',
    scope: {asset: '=psAsset'},
    require: '^stackable',
    templateUrl: requirejs.toUrl(
      'p3/components/assetora/add-listing-modal.html'),
    link: Link
  };

  function Link(scope, element, attrs, stackable) {
    // FIXME: use root/global data, move over to model
    scope.data = config.data || {};
    scope.identity = config.data.identity || {};

    scope.model = {};
    scope.model.loading = false;
    scope.model.asset = scope.asset;
    scope.model.listing = {
      '@context': 'https://w3id.org/payswarm/v1'
    };
    scope.model.destination = null;

    scope.addListing = function() {
      // FIXME: add more listing details
      // FIXME: remove test data
      var listing = scope.model.listing;
      listing.type = ['Listing', 'gr:Offering'];
      listing.vendor = scope.identity.id;
      listing.payee = [{
        type: 'Payee',
        destination: scope.model.destination.id,
        currency: 'USD',
        payeeGroup: ['vendor'],
        payeeRate: '0.05', //scope.model.total,
        payeeRateType: 'FlatAmount',
        payeeApplyType: 'ApplyExclusively',
        comment: 'Price for ' + scope.asset.title
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
      listing.sysPublished = util.w3cDate();

      console.log('listing', listing);
      listing.asset = scope.asset.id;
      psHostedListingService.add(listing).then(function(listing) {
        scope.loading = false;
        stackable.close(null, listing);
      }).catch(function(err) {
        brAlertService.add('error', err, {scope: scope});
        scope.loading = false;
      });
    };
  }
}

return {psAddListingModal: factory};

});
