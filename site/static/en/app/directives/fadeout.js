/*!
 * Fade Out directive.
 *
 * @author Dave Longley
 */
(function() {

define(['angular'], function(angular) {

var name = 'fadeout';
var deps = ['$parse'];
var factory = function($parse) {
  return {
    link: function(scope, element, attrs) {
      scope.$watch(attrs.fadeout, function(value) {
        if(value) {
          element.fadeOut(function() {
            var fn = $parse(attrs.fadeoutCallback) || angular.noop;
            scope.$apply(function() {
              fn(scope);
            });
          });
        }
      });
    }
  };
};

return {name: name, deps: deps, factory: factory};
});

})();
