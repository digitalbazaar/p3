/*!
 * Add Asset Modal.
 *
 * @author Dave Longley
 */
define([], function() {

var deps = ['svcModal'];
return {modalAddAsset: deps.concat(factory)};

function factory(svcModal) {
  function Ctrl($scope, svcHostedAsset) {
    // FIXME: use root/global data, move over to model
    $scope.data = window.data || {};
    $scope.identity = $scope.data.identity || {};
    $scope.feedback = {};

    $scope.model = {};
    $scope.model.loading = false;
    $scope.model.asset = {
      '@context': 'https://w3id.org/payswarm/v1',
      type: 'Asset',
      // FIXME: add more asset details
      // FIXME: remove test data
      title: 'TITLE',
      creator: {fullName: 'My Full Name'},
      assetProvider: $scope.identity.id,
      listingRestrictions: {vendor: $scope.identity.id},
      assetContent: 'http://wordpress.payswarm.dev/asset-content/test.html',
      // FIXME: figure out whether published flag is desirable
      psaPublished: window.iso8601.w3cDate()
    };

    $scope.addAsset = function() {
      var asset = $scope.model.asset;
      asset.created = window.iso8601.w3cDate();

      console.log('asset', asset);
      svcHostedAsset.add(asset, function(err, asset) {
        $scope.loading = false;
        if(!err) {
          $scope.modal.close(null, asset);
        }
        $scope.feedback.error = err;
      });
    };
  }

  return svcModal.directive({
    name: 'AddAsset',
    templateUrl: '/app/templates/modals/add-asset.html',
    controller: ['$scope', 'svcHostedAsset', Ctrl],
    link: function(scope, element, attrs) {
      scope.feedbackTarget = element;
    }
  });
}

});
