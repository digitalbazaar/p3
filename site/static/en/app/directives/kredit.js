/*!
 * Kredit font directive.
 *
 * @author Dave Longley
 */
(function() {

define(['jquery'], function($) {

var name = 'kredit';
var deps = [];
var factory = function() {
  // FIXME: remove once webkit non-windows font difference is fixed
  return function(scope, element, attrs) {
    if($.browser.webkit) {
      attrs.$observe('kredit', function(value) {
        if(!/windows/.test(navigator.userAgent.toLowerCase())) {
          element.css('letter-spacing', '1px');
        }
      });
    }
  };
};

return {name: name, deps: deps, factory: factory};
});

})();
