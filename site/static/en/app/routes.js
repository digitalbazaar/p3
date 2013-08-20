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
    ['$routeProvider', '$locationProvider',
    function($routeProvider, $locationProvider) {
      $locationProvider.html5Mode(true);
      $locationProvider.hashPrefix('!');
      angular.forEach(routes, function(route) {
        route($routeProvider, $locationProvider);
      });

      // route not known, redirect to simple path
      $routeProvider.otherwise({
        redirectTo: function(params, path, search) {
          window.location.href = path;
        }
      });
    }
  ]);
});
