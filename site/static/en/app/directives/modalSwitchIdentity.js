/*!
 * Switch Identity Modal.
 *
 * @author Dave Longley
 */
(function() {

define(['payswarm.api'], function(payswarm) {

var name = 'modalSwitchIdentity';
var deps = ['svcModal', 'svcIdentity'];
var factory = function(svcModal, svcIdentity) {
  function Ctrl($scope) {
    $scope.model = {};
    $scope.data = window.data || {};
    $scope.identityTypes = ['PersonalIdentity', 'VendorIdentity'];
    $scope.identities = svcIdentity.identities;
    $scope.selected = svcIdentity.identity;

    $scope.switchIdentity = function() {
      // if current url starts with '/i', switch to other identity's dashboard
      var identity = $scope.selected;
      var redirect = window.location.href;
      if(window.location.pathname.indexOf('/i') === 0) {
        redirect = identity.id + '/dashboard';
      }

      payswarm.switchIdentity({
        identity: identity.id,
        redirect: redirect
      });
    };
  }

  return svcModal.directive({
    name: 'SwitchIdentity',
    templateUrl: '/partials/modals/switch-identity.html',
    controller: Ctrl
  });
};

return {name: name, deps: deps, factory: factory};
});

})();
