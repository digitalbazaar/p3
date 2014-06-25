/*!
 * Tickets
 *
 * @author Digital Bazaar, Inc.
 */
define([], function() {

var deps = ['$scope', 'config'];
return {
  controller: {TicketsCtrl: deps.concat(factory)},
  routes: [{
    path: '/i/:identity/tickets',
    options: {
      templateUrl: '/app/component/assetora/tickets.html',
      controller: 'TicketsCtrl'
    }
  }]
};

function factory($scope, config) {
  $scope.model = {};
  $scope.identity = config.data.identity;
}

});
