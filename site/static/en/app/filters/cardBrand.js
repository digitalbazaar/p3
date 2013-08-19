/*!
 * Card brand filter.
 *
 * @author Dave Longley
 */
(function() {

define([], function() {

var name = 'cardBrand';
var deps = [];
var factory = function() {
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
};

return {name: name, deps: deps, factory: factory};
});

})();
