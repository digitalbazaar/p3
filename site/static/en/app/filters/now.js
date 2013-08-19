/*!
 * Now date filter.
 *
 * @author Dave Longley
 */
(function() {

define([], function() {

var name = 'now';
var deps = ['$filter'];
var factory = function($filter) {
  return function(value, format) {
    return $filter('date')(new Date(), format);
  };
};

return {name: name, deps: deps, factory: factory};
});

})();
