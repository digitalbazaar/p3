/*!
 * PaySwarm Angular Filters
 *
 * @author Dave Longley
 */
(function() {

angular.module('payswarm.filters')
.filter('cardBrand', function() {
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
})
.filter('slug', function() {
  return function(input) {
    // replace spaces with dashes, make lower case and URI encode
    if(input === undefined || input.length === 0) {
      input = '';
    }
    return encodeURIComponent(
      input.replace(/\s+/g, '-').replace(/[^\w-]+/g, '').toLowerCase());
  };
})
.filter('ceil', function() {
  return function(value, digits) {
    value = (value === undefined || value === null) ? '' : value.toString();
    if(digits === undefined) {
      digits = 2;
    }
    var num = parseFloat(value);
    var k = Math.pow(10, digits);
    return (Math.ceil(num * k) / k).toFixed(digits);
  };
})
.filter('floor', function() {
  return function(value, digits) {
    value = (value === undefined || value === null) ? '' : value.toString();
    if(digits === undefined) {
      digits = 2;
    }
    if(value === null || value === undefined) {
      value = '0';
    }
    var dec = value.indexOf('.');
    if(dec === -1) {
      dec = value.length;
      value += '.';
    }
    if(dec === 0) {
      value = '0' + value;
    }
    value = value.substr(0, dec + 3);
    var length = dec + digits + 1;
    return value + new Array(length - value.length + 1).join('0');
  };
})
.filter('prefill', function() {
  return function(value, length, char) {
    if(length === undefined) {
      length = 2;
    }
    if(char === undefined) {
      char = '0';
    }
    value = (value === undefined || value === null) ? '' : value.toString();
    return new Array(length - value.length + 1).join(char) + value;
  };
})
.filter('ccNumber', function() {
  return function(value) {
    value = (value === undefined || value === null) ? '****' : value.toString();
    return '**** **** **** ' + value.substr(1);
  };
})
.filter('ellipsis', function() {
  return function(value, length) {
    length = Math.max(3, length);
    length -= 3;
    if(value.length > length) {
      value = value.substr(0, length) + '...';
    }
    return value;
  };
})
.filter('mask', function() {
  return function(value, length) {
    if(length === undefined) {
      length = 5;
    }
    value = value.substr(value.length - 4);
    return new Array(length - value.length + 1).join('*') + value;
  };
})
.filter('now', function($filter) {
  return function(value, format) {
    return $filter('date')(new Date(), format);
  };
});

})();
