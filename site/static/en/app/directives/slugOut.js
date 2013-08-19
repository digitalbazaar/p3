/*!
 * Slug Out directive.
 *
 * @author Dave Longley
 */
(function() {

define(['angular'], function(angular) {

var name = 'slugOut';
var deps = ['$filter', '$parse'];
var factory = function($filter, $parse) {
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      var slug = $filter('slug');
      var set = $parse(attrs.slugOut).assign || angular.noop;
      element.on('propertychange change input keyup paste', function(e) {
        scope.$apply(function() {
          set(scope, slug(element.val()));
        });
      });
    }
  };
};

return {name: name, deps: deps, factory: factory};
});

})();
