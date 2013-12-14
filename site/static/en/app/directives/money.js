/*!
 * Money directive.
 *
 * @author Digital Bazaar
 */
define([], function() {

'use strict';

var INFO = {
  'USD': {
    symbol: '$',
    digits: 2
  },
  'DEFAULT': {
    symbol: '',
    digits: 2
  }
};

var deps = [];
return {money: deps.concat(factory)};

function factory() {
  return {
    scope: {
      money: '=',
      important: '@',
      // FIXME: add mode to display exact value and no tooltip
      //exact: '@'
      // FIXME: add rounding mode
      //roundMode: '@'
    },
    replace: true,
    templateUrl: '/app/templates/money.html',
    controller: ['$scope', function($scope) {
      if($scope.precise) {
      }
      $scope.$watch('money.currency', function(value) {
        value = value || 'DEFAULT';
        $scope.symbol = INFO[value].symbol;
        $scope.digits = INFO[value].digits;
      }, true);
    }]
  };
}

});
