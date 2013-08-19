/*!
 * Focus directive.
 *
 * @author Dave Longley
 */
(function() {

define([], function() {

var name = 'ngFocus';
var deps = ['$parse'];
var factory = function($parse) {
  // FIXME: polyfill until implemented in core AngularJS
  return function(scope, element, attrs) {
    var fn = $parse(attrs.ngFocus);
    element.focus(function(event) {
      scope.$apply(function() {
        fn(scope, {$event: event});
      });
    });
  };
};

return {name: name, deps: deps, factory: factory};
});

})();
