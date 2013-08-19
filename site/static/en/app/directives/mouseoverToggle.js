/*!
 * Mouseover Toggle directive.
 *
 * @author Dave Longley
 */
(function() {

define(['angular'], function(angular) {

var name = 'mouseoverToggle';
var deps = ['$parse'];
var factory = function($parse) {
  return function(scope, element, attrs) {
    var get = $parse(attrs.mouseoverToggle);
    var set = get.assign || angular.noop;
    element.mouseenter(function() {
      scope.$apply(function() {
        set(scope, true);
      });
    });
    element.mouseleave(function() {
      scope.$apply(function() {
        set(scope, false);
      });
    });
  };
};

return {name: name, deps: deps, factory: factory};
});

})();
