/*!
 * Content Portal Controller.
 *
 * @author Dave Longley
 */
(function() {

define([], function() {

var name = 'ContentPortalCtrl';
var deps = ['$scope'];
var factory = function($scope) {
  $scope.model = {};
  // FIXME: globalize window.data access
  var data = window.data || {};
  $scope.model = {
    asset: data.asset,
    encryptedReceipt: data.encryptedReceipt
  };
};

return {name: name, deps: deps, factory: factory};
});

})();
