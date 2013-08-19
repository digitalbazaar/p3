/*!
 * vcard Address directive.
 *
 * @author Dave Longley
 */
(function() {

define([], function() {

var name = 'vcardAddress';
var deps = [];
var factory = function() {
  return {
    scope: {
      address: '=vcardAddress',
      noLabel: '='
    },
    templateUrl: '/partials/vcard-address.html'
  };
};

return {name: name, deps: deps, factory: factory};
});

})();
