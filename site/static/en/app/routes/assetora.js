/*!
 * Assetora Routes.
 *
 * @author Dave Longley
 */
define([], function() {

return function($routeProvider) {
  $routeProvider.when('/i/:identity/tools', {
    templateUrl: '/partials/tools/tools.html'
  })
  .when('/i/:identity/assetora', {
    templateUrl: '/partials/tools/assetora.html',
    controller: 'AssetoraCtrl'
  })
  .when('/i/:identity/invoices', {
    templateUrl: '/partials/tools/invoices.html',
    controller: 'InvoicesCtrl'
  })
  .when('/i/:identity/causes', {
    templateUrl: '/partials/tools/causes.html',
    controller: 'CausesCtrl'
  })
  .when('/i/:identity/tickets', {
    templateUrl: '/partials/tools/tickets.html',
    controller: 'TicketsCtrl'
  });
};

});
