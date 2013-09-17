/*!
 * Tickets
 *
 * @author Digital Bazaar, Inc.
 */
define(['angular'], function(angular) {

var deps = ['$scope', 'svcHostedAsset', 'svcHostedListing', '$timeout'];
return {
  controller: {TicketsCtrl: deps.concat(factory)},
  routes: [{
    path: '/i/:identity/tickets',
    options: {
      templateUrl: '/partials/tools/tickets.html',
      controller: 'TicketsCtrl'
    }
  }]
};

function factory($scope, svcHostedAsset, svcHostedListing, $timeout) {
  $scope.model = {};
  // FIXME: globalize window.data access
  var data = window.data || {};
  $scope.identity = data.identity;
}

});
