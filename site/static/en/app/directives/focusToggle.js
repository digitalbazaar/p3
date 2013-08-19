/*!
 * Focus Toggle directive.
 *
 * @author Dave Longley
 */
(function() {

define(['angular'], function(angular) {

var name = 'focusToggle';
var deps = ['$parse'];
var factory = function($parse) {
  return function(scope, element, attrs) {
    var get = $parse(attrs.focusToggle);
    var set = get.assign || angular.noop;
    element.focus(function() {
      scope.$apply(function() {
        set(scope, true);
      });
    });
    element.blur(function() {
      scope.$apply(function() {
        set(scope, false);
      });
    });
  };
};

return {name: name, deps: deps, factory: factory};
});

})();
