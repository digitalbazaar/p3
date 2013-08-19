/*!
 * A polyfill for placeholder.
 *
 * @author Dave Longley
 */
(function() {

define([], function() {

var name = 'placeholder';
var deps = [];
var factory = function() {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function(scope, element, attrs, ngModel) {
      if(element.placeholder) {
        element.placeholder();
      }
    }
  };
};

return {name: name, deps: deps, factory: factory};
});

})();
