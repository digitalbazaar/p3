/*!
 * Ellipsis filter.
 *
 * @author Dave Longley
 */
(function() {

define([], function() {

var name = 'ellipsis';
var deps = [];
var factory = function() {
  return function(value, length) {
    length = Math.max(3, length);
    length -= 3;
    if(value.length > length) {
      value = value.substr(0, length) + '...';
    }
    return value;
  };
};

return {name: name, deps: deps, factory: factory};
});

})();
