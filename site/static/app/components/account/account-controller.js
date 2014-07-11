/*!
 * Account Controller.
 *
 * @author Manu Sporny
 * @author David I. Lehn
 * @author Dave Longley
 */
define([], function() {

/* @ngInject */
function factory($scope, config) {
  $scope.model = {};
  $scope.account = config.data.account;
}

return {AccountController: factory};

});
