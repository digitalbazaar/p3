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
      templateUrl: '/app/templates/tools/tools.html'
    }
  }]
};

});
