/*!
 * Tickets
 *
 * @author Digital Bazaar, Inc.
 */
define([], function() {

var deps = ['$scope', 'config'];
return {
  controller: {TicketsController: deps.concat(factory)},
  routes: [{
    path: '/i/:identity/tickets',
    options: {
      templateUrl: '/app/component/assetora/tickets.html',
      controller: 'TicketsController'
    }
  }]
};

function factory($scope, config) {
  $scope.model = {};
  $scope.identity = config.data.identity;
}

});
