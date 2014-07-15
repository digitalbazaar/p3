/*!
 * Content Portal Controller.
 *
 * @author Dave Longley
 */
define([], function() {

'use strict'; 

/* @ngInject */
function factory($scope, config) {
  $scope.model = {
    asset: config.data.asset,
    encryptedReceipt: config.data.encryptedReceipt
  };
}

return {ContentPortalController: factory};

});
