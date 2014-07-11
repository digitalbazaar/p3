/*!
 * Content Portal Controller.
 *
 * @author Dave Longley
 */
define([], function() {

/* @ngInject */
function factory($scope, config) {
  $scope.model = {
    asset: config.data.asset,
    encryptedReceipt: config.data.encryptedReceipt
  };
}

return {ContentPortalController: factory};

});
