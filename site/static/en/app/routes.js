/*!
 * Routes module.
 *
 * @author Dave Longley
 */
define([
  'angular',
  'app/routes/assetora'
], function(angular) {
  var routes = Array.prototype.slice.call(arguments, 1);
  angular.module('app.routes', []).config(
    ['$locationProvider', '$routeProvider',
    function($locationProvider, $routeProvider) {
      $locationProvider.html5Mode(true);
      $locationProvider.hashPrefix('!');
      angular.forEach(routes, function(route) {
        route($locationProvider, $routeProvider);
      });

      // route not known, redirect to simple path
      $routeProvider.otherwise({
        redirectTo: function(params, path, search) {
          if(window.location.pathname !== path) {
            window.location.href = path;
          }
        }
      });
    }
  ]);
});
