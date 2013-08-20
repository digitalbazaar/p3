/*!
 * Credit card number filter.
 *
 * @author Dave Longley
 */
define([], function() {

var deps = [];
return {ccNumber: deps.concat(factory)};

function factory() {
  return function(value) {
    value = (value === undefined || value === null) ? '****' : value.toString();
    return '**** **** **** ' + value.substr(1);
  };
}

});
