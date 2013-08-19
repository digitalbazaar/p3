/*!
 * Fade In directive.
 *
 * @author Dave Longley
 */
(function() {

define(['angular'], function(angular) {

var name = 'fadein';
var deps = ['$parse'];
var factory = function($parse) {
  return {
    link: function(scope, element, attrs) {
      scope.$watch(attrs.fadein, function(value) {
        if(value) {
          element.fadeIn(function() {
            var fn = $parse(attrs.fadeinCallback) || angular.noop;
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
