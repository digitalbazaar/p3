/*!
 * Account Controller.
 *
 * @author Manu Sporny
 * @author David I. Lehn
 * @author Dave Longley
 */
(function() {

define([], function() {

var name = 'AccountCtrl';
var deps = ['$scope'];
var factory = function($scope) {
  $scope.model = {};
  var data = window.data || {};
  $scope.account = data.account;
};

return {name: name, deps: deps, factory: factory};
});

})();
