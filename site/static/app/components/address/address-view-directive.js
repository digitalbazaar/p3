/*!
 * Address directive.
 *
 * @author Dave Longley
 */
define([], function() {

var deps = [];
return {addressView: deps.concat(factory)};

function factory() {
  return {
    scope: {
      address: '=addressView',
      noLabel: '=?'
    },
    templateUrl: '/app/components/address/address-view.html'
  };
}

});
