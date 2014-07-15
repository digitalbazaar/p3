/*!
 * Card brand filter.
 *
 * @author Dave Longley
 */
define([], function() {

'use strict'; 

/* @ngInject */
function factory() {
  return function(input, logo) {
    if(input === 'Visa') {
      return logo ? 'cc-logo-visa' : 'Visa';
    }
    if(input === 'MasterCard') {
      return logo ? 'cc-logo-mastercard' : 'MasterCard';
    }
    if(input === 'Discover') {
      return logo ? 'cc-logo-discover': 'Discover';
    }
    if(input === 'AmericanExpress') {
      return logo ? 'cc-logo-amex' : 'American Express';
    }
    if(input === 'ChinaUnionPay') {
      return logo ? 'cc-logo-china-up' : 'China Union Pay';
    }
  };
}

return {cardBrand: factory};

});
