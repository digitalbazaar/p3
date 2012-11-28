/*!
 * Key Details
 *
 * @author Manu Sporny
 * @author David I. Lehn
 * @author Dave Longley
 */
// FIXME: use RequireJS AMD format
(function() {

angular.module('payswarm').controller('KeyCtrl', KeyCtrl);

function KeyCtrl($scope) {
  $scope.model = {};
  var data = window.data || {};
  $scope.key = data.key;
};

})();
