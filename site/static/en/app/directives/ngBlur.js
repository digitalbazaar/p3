/*!
 * Blur directive.
 *
 * @author Dave Longley
 */
(function() {

define([], function() {

var name = 'ngBlur';
var deps = ['$parse'];
var factory = function($parse) {
  // FIXME: polyfill until implemented in core AngularJS
  return function(scope, element, attrs) {
    var fn = $parse(attrs.ngBlur);
    element.blur(function(event) {
      scope.$apply(function() {
        fn(scope, {$event: event});
      });
    });
  };
};

return {name: name, deps: deps, factory: factory};
});

})();
