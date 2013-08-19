/*!
 * Key Details.
 *
 * @author Manu Sporny
 * @author David I. Lehn
 * @author Dave Longley
 */
(function() {

define([], function() {

var name = 'KeyCtrl';
var deps = ['$scope'];
var factory = function($scope) {
  $scope.model = {};
  var data = window.data || {};
  $scope.key = data.key;
};

return {name: name, deps: deps, factory: factory};
});

})();
