/*!
 * vcard Address directive.
 *
 * @author Dave Longley
 */
define([], function() {

var deps = [];
return {vcardAddress: deps.concat(factory)};

function factory() {
  return {
    scope: {
      address: '=vcardAddress',
      noLabel: '='
    },
    templateUrl: '/app/templates/vcard-address.html'
  };
}

});
