/*!
 * PaySwarm Angular Module
 *
 * @author Dave Longley
 */
(function() {

angular.module('payswarm.directives', []);
angular.module('payswarm.filters', []);
angular.module('payswarm.services', []);
angular.module(
  'payswarm', ['payswarm.directives', 'payswarm.filters', 'payswarm.services']);

})();
