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

var deps = ['$filter'];
return {money: deps.concat(factory)};

function factory($filter) {
  return {
    scope: {
      money: '=',
      // hint to highlight the value
      important: '@',
      // field name to get value from (default: 'amount')
      valueField: '@',
      // display exact value and no tooltip
      exact: '@',
      // round mode: 'up' or 'down', default: 'up'
      roundMode: '@'
    },
    replace: true,
    templateUrl: '/app/components/transaction/money.html',
    compile: function(element, attrs) {
      if(!attrs.important) {
        attrs.important = false;
      }
      if(!attrs.exact) {
        attrs.exact = false;
      }
      if(!attrs.valueField) {
        attrs.valueField = 'amount';
      }
      if(!attrs.roundMode) {
        attrs.roundMode = 'up';
      }
    },
    link: Link
  };

  function Link(scope) {
    scope.$watch('money', function(money) {
      if(!money) {
        return;
      }
      // FIXME: fix defaulting in compile function
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

});
