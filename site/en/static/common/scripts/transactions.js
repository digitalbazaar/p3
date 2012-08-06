/*!
 * Transaction Activity Support
 *
 * @requires jQuery v1.7+ (http://jquery.com/)
 *
 * @author Dave Longley
 */
// FIXME: use RequireJS AMD format
(function($) {

var module = angular.module('activity', []).
run(function() {
  // FIXME: run init code here
});

module.controller('ActivityCtrl', function($scope) {
  // initialize model
  $scope.txns = [];
  $scope.txnBegin = new Date();
  $scope.txnEnd = new Date();
  $scope.resStart = 0;
  $scope.resEnd = 0;

  // FIXME: do other stuff
});

})(jQuery);
