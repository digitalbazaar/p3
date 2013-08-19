/*!
 * encodeURIComponent filter.
 *
 * @author Dave Longley
 */
(function() {

define([], function() {

var name = 'encodeURIComponent';
var deps = [];
var factory = function() {
  return function(value) {
    if(value === undefined || value === null) {
      return '';
    }
    return encodeURIComponent(value);
  };
};

return {name: name, deps: deps, factory: factory};
});

})();
