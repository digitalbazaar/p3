/*!
 * Navbar
 *
 * @author Dave Longley
 */
(function() {

var module = angular.module('payswarm');

module.controller('NavbarCtrl', function($scope) {
  $scope.session = window.data.session;
});

})();
