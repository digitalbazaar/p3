/*!
 * Causes
 *
 * @author Digital Bazaar, Inc.
 */
define([], function() {

'use strict';

/* @ngInject */
function factory($scope, config) {
  $scope.model = {};
  $scope.identity = config.data.identity;
}

return {CausesController: factory};

});
