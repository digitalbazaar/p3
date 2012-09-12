/*!
 * Navbar
 *
 * @author Dave Longley
 */
(function($) {

var module = angular.module('payswarm');

module.controller('NavbarCtrl', function($scope) {
  $scope.session = window.data.session;

  // get minimum width for navbar
  $scope.minWidth = function() {
    var rval = 0;

    // simulate popover-content
    var el = $([
      '<div class="popover" style="width: auto">',
      '<div class="popover-content"><table><tbody><tr><td>Identity:</td><td>',
      $scope.session.profile.email,
      '</td></tr></tbody></table></div></div>'].join(''));
    $('body').append(el);
    rval = el.outerWidth(true);
    el.remove();

    return rval;
  };
});

})($);
