/*!
 * Account Details
 *
 * @author Manu Sporny
 * @author David I. Lehn
 * @author Dave Longley
 */
// FIXME: use RequireJS AMD format
(function() {

angular.module('payswarm').controller('AccountCtrl', AccountCtrl);

function AccountCtrl($scope) {
  $scope.model = {};
  var data = window.data || {};
  $scope.account = data.account;
};

})();
