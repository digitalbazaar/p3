/*!
 * Asset Management Tools.
 *
 * @author Dave Longley
 */
define([], function() {

var deps = [];
return {
  routes: [{
    path: '/i/:identity/tools',
    options: {
      templateUrl: '/partials/tools/tools.html'
    }
  }]
};

});
