/*!
 * Kredit font directive.
 *
 * @author Dave Longley
 */
define(['jquery'], function($) {

/* @ngInject */
function factory() {
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
}

return {kredit: factory};

});
