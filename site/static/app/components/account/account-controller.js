/*!
 * Account Controller.
 *
 * @author Manu Sporny
 * @author David I. Lehn
 * @author Dave Longley
 */
define([], function() {

var deps = ['$scope', 'config'];
return {AccountCtrl: deps.concat(factory)};

function factory($scope, config) {
  $scope.model = {};
  $scope.account = config.data.account;
}

});
