/*!
 * Selector Modal.
 *
 * @author Dave Longley
 */
(function() {

define([], function() {

var name = 'modalSelector';
var deps = ['svcModal'];
var factory = function(svcModal) {
  return svcModal.directive({
    name: 'Selector',
    scope: {
      modalTitle: '=',
      items: '=',
      itemType: '='
    },
    transclude: true,
    templateUrl: '/partials/modals/selector.html'
  });
};

return {name: name, deps: deps, factory: factory};
});

})();
