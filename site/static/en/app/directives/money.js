/*!
 * Money directive.
 *
 * @author Digital Bazaar
 */
define([], function() {

'use strict';

var CURRENCY_INFO = {
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
      // hint to highlight the value
      important: '@',
      // field name to get value from (default: 'amount')
      valueField: '@',
      // FIXME: add mode to display exact value and no tooltip
      //exact: '@'
      // FIXME: add rounding mode
      //roundMode: '@'
    },
    replace: true,
    templateUrl: '/app/templates/money.html',
    compile: function(element, attrs) {
      if(!attrs.valueField) {
        attrs.valueField = 'amount'
      }
    },
    controller: ['$scope', function($scope) {
      $scope.$watch('money.currency', function(value) {
        value = value || 'DEFAULT';
        $scope.symbol = CURRENCY_INFO[value].symbol;
        $scope.digits = CURRENCY_INFO[value].digits;
      }, true);
    }]
  };
}

});
