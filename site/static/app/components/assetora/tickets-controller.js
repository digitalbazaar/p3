/*!
 * Tickets
 *
 * @author Digital Bazaar, Inc.
 */
define([], function() {

/* @ngInject */
function factory($scope, config) {
  $scope.model = {};
  $scope.identity = config.data.identity;
}

return {TicketsController: factory};

});
