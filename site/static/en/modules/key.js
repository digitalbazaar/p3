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
  var data = window.data || {};
  $scope.session = data.session || null;
  $scope.key = data.key;
};

})();
