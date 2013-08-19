/*!
 * PaySwarm Angular Module
 *
 * @author Dave Longley
 */
(function() {

// define console.log for IE
//window.console = window.console || {};
//window.console.log = window.console.log || angular.noop();

// FIXME: can just call this 'app' or something, don't need module name
angular.module('payswarm.services', []);
angular.module('payswarm.directives', ['payswarm.services']);
angular.module('payswarm.filters', []);
angular.module('payswarm', [
  'payswarm.directives',
  'payswarm.filters',
  'payswarm.services',
  'ui'
// FIXME: protect against minimization
]).run(function($rootScope) {
  // utility functions
  var jsonld = $rootScope.jsonld = {};
  jsonld.isType = function(obj, value) {
    var types = obj['type'];
    if(types) {
      if(!angular.isArray(types)) {
        types = [types];
      }
      return types.indexOf(value) !== -1;
    }
    return false;
  };
});

})();
