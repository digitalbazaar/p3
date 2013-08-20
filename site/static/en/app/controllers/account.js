/*!
 * Account Controller.
 *
 * @author Manu Sporny
 * @author David I. Lehn
 * @author Dave Longley
 */
define([], function() {

var deps = ['$scope'];
return {AccountCtrl: deps.concat(factory)};

function factory($scope) {
  $scope.model = {};
  var data = window.data || {};
  $scope.account = data.account;
}

});
