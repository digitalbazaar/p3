/*!
 * Tooltip Title directive.
 *
 * @author Dave Longley
 */
(function() {

define([], function() {

var name = 'tooltipTitle';
var deps = [];
var factory = function() {
  return function(scope, element, attrs) {
    var show = false;
    attrs.$observe('tooltipTitle', function(value) {
      if(element.data('tooltip')) {
        element.tooltip('hide');
        element.removeData('tooltip');
      }
      element.tooltip({
        title: value
      });
      if(show) {
        element.data('tooltip').show();
      }
    });
    attrs.$observe('tooltipShow', function(value) {
      if(value !== undefined) {
        var tooltip = element.data('tooltip');
        if(value === 'true') {
          show = true;
          if(tooltip) {
            tooltip.show();
          }
        }
        else {
          show = false;
          if(tooltip) {
            tooltip.hide();
          }
        }
      }
    });
  };
};

return {name: name, deps: deps, factory: factory};
});

})();
