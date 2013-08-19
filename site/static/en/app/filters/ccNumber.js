/*!
 * Credit card number filter.
 *
 * @author Dave Longley
 */
(function() {

define([], function() {

var name = 'ccNumber';
var deps = [];
var factory = function() {
  return function(value) {
    value = (value === undefined || value === null) ? '****' : value.toString();
    return '**** **** **** ' + value.substr(1);
  };
};

return {name: name, deps: deps, factory: factory};
});

})();
