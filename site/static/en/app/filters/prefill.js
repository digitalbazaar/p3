/*!
 * Prefill filter.
 *
 * @author Dave Longley
 */
(function() {

define([], function() {

var name = 'prefill';
var deps = [];
var factory = function() {
  return function(value, length, ch) {
    if(length === undefined) {
      length = 2;
    }
    if(ch === undefined) {
      ch = '0';
    }
    value = (value === undefined || value === null) ? '' : value.toString();
    return new Array(length - value.length + 1).join(ch) + value;
  };
};

return {name: name, deps: deps, factory: factory};
});

})();
