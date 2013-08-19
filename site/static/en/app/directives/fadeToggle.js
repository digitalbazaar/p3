/*!
 * Fade Toggle directive.
 *
 * @author Dave Longley
 */
(function() {

define([], function() {

var name = 'fadeToggle';
var deps = ['$parse'];
var factory = function($parse) {
  return {
    link: function(scope, element, attrs) {
      // init to hidden
      element.addClass('hide');
      scope.$watch(attrs.fadeToggle, function(value) {
        if(value) {
          if(element.is(':animated')) {
            element.stop(true, true).show();
          }
          else {
            element.fadeIn();
          }
        }
        else {
          if(element.is(':animated')) {
            element.stop(true, true).hide();
          }
          else {
            element.fadeOut();
          }
        }
      });
    }
  };
};

return {name: name, deps: deps, factory: factory};
});

})();
