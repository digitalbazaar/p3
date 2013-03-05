/*!
 * PaySwarm Angular Module
 *
 * @author Dave Longley
 */
(function() {

// define console.log for IE
window.console = window.console || {};
window.console.log = window.console.log || angular.noop();

angular.module('payswarm.services', []);
angular.module('payswarm.directives', ['payswarm.services']);
angular.module('payswarm.filters', []);
angular.module('payswarm', [
  'payswarm.directives',
  'payswarm.filters',
  'payswarm.services',
  'ui']);

})();
