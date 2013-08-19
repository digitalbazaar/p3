/*!
 * Slug filter.
 *
 * @author Dave Longley
 */
(function() {

define([], function() {

var name = 'slug';
var deps = [];
var factory = function() {
  return function(input) {
    // replace spaces with dashes, make lower case and URI encode
    if(input === undefined || input.length === 0) {
      input = '';
    }
    return encodeURIComponent(
      input.replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').toLowerCase());
  };
};

return {name: name, deps: deps, factory: factory};
});

})();
