/*!
 * Alert Modal.
 *
 * @author Dave Longley
 */
(function() {

define([], function() {

var name = 'modalAlert';
var deps = ['svcModal'];
var factory = function(svcModal) {
  return svcModal.directive({
    name: 'Alert',
    transclude: true,
    templateUrl: '/partials/modals/alert.html',
    scope: {
      header: '@modalHeader',
      ok: '@modalOk',
      cancel: '@modalCancel'
    }
  });
};

return {name: name, deps: deps, factory: factory};
});

})();
