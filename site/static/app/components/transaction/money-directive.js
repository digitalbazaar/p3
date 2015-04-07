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
    precision: 2
  },
  'DEFAULT': {
    symbol: '',
    precision: 2
  }
};

/* @ngInject */
function factory($filter) {
  return {
    restrict: 'A',
    scope: {
      money: '=psMoney',
      // hint to highlight the value
      important: '@?psImportant',
      // field name to get value from (default: 'amount')
      valueField: '@?psValueField',
      // display exact value and no tooltip
      exact: '@?psExact',
      // round mode: 'up' or 'down', default: 'up'
      roundMode: '@?psRoundMode'
    },
    replace: true,
    templateUrl: requirejs.toUrl('p3/components/transaction/money.html'),
    link: Link
  };

  function Link(scope) {
    scope.$watch('money', function(money) {
      if(!money) {
        return;
      }
      // set defaults
      scope.important = !!scope.important;
      scope.exact = !!scope.exact;
      scope.valueField = scope.valueField || 'amount';
      scope.roundMode = scope.roundMode || 'up';

      var amount = '';
      if(scope.valueField in money) {
        amount = money[scope.valueField];
      }
      var currency = money.currency || 'DEFAULT';
      scope.symbol = CURRENCY_INFO[currency].symbol;
      var precision = CURRENCY_INFO[currency].precision;
      scope.exactAmount = amount;
      if(scope.exact) {
        scope.formattedAmount = amount;
      } else if(scope.roundMode === 'down') {
        scope.formattedAmount = $filter('floor')(amount, precision);
      } else if(scope.roundMode === 'up') {
        scope.formattedAmount = $filter('ceil')(amount, precision);
      } else {
        scope.formattedAmount = amount;
      }
    }, true);
  }
}

return {psMoney: factory};

});
