/*!
 * Causes
 *
 * @author Digital Bazaar, Inc.
 */
define([], function() {

var deps = ['$scope', 'config'];
return {
  controller: {CausesController: deps.concat(factory)},
  routes: [{
    path: '/i/:identity/causes',
    options: {
      templateUrl: '/app/components/assetora/causes.html',
      controller: 'CausesController'
    }
  }]
};

function factory($scope, config) {
  $scope.model = {};
  $scope.identity = config.data.identity;
}

});
