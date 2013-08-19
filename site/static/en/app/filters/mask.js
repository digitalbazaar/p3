/*!
 * Mask filter.
 *
 * @author Dave Longley
 */
(function() {

define([], function() {

var name = 'mask';
var deps = [];
var factory = function() {
  return function(value, length) {
    if(length === undefined) {
      length = 5;
    }
    value = value.substr(value.length - 4);
    return new Array(length - value.length + 1).join('*') + value;
  };
};

return {name: name, deps: deps, factory: factory};
});

})();
