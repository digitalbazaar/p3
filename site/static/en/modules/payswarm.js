/*!
 * PaySwarm Angular Module
 *
 * @author Dave Longley
 */
(function() {

angular.module('payswarm.services', []);
angular.module('payswarm.directives', ['payswarm.services']);
angular.module('payswarm.filters', []);
angular.module('payswarm', [
  'payswarm.directives',
  'payswarm.filters',
  'payswarm.services',
  'ui']);

})();
