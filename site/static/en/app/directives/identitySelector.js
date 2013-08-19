/*!
 * Identity Selector directive.
 *
 * @author Dave Longley
 */
(function() {

define([], function() {

var name = 'identitySelector';
var deps = [];
var factory = function() {
  function Link(scope, element, attrs) {
    attrs.$observe('fixed', function(value) {
      scope.fixed = value;
    });
  }

  return {
    scope: {
      identityTypes: '=',
      identities: '=',
      selected: '=',
      invalid: '=',
      fixed: '@'
    },
    templateUrl: '/partials/identity-selector.html',
    link: Link
  };
};

return {name: name, deps: deps, factory: factory};
});

})();
