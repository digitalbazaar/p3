/*!
 * PaySwarm Angular Filters
 *
 * @author Dave Longley
 */
(function() {

angular.module('payswarm.filters')
.filter('cardBrand', function() {
  return function(input, logo) {
    if(input === 'ccard:Visa') {
      return logo ? 'cc-logo-visa' : 'Visa';
    }
    if(input === 'ccard:MasterCard') {
      return logo ? 'cc-logo-mastercard' : 'MasterCard';
    }
    if(input === 'ccard:Discover') {
      return logo ? 'cc-logo-discover': 'Discover';
    }
    if(input === 'ccard:AmericanExpress') {
      return logo ? 'cc-logo-amex' : 'American Express';
    }
    if(input === 'ccard:ChinaUnionPay') {
      return logo ? 'cc-logo-china-up' : 'China Union Pay';
    }
  };
});

// FIXME: add filter to properly round precise currency up

})();
