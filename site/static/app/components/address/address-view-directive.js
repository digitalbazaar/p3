/*!
 * Address directive.
 *
 * @author Dave Longley
 */
define([], function() {

/* @ngInject */
function factory() {
  return {
    scope: {
      address: '=addressView',
      noLabel: '=?'
    },
    templateUrl: '/app/components/address/address-view.html'
  };
}

return {addressView: factory};

});
