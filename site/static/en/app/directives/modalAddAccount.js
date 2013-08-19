/*!
 * Add Account Modal.
 *
 * @author Dave Longley
 */
(function() {

define(['payswarm.api'], function(payswarm) {

var name = 'modalAddAccount';
var deps = ['svcModal', 'svcIdentity', 'svcAccount'];
var factory = function(svcModal, svcIdentity, svcAccount) {
  function Ctrl($scope) {
    $scope.model = {};
    $scope.data = window.data || {};
    $scope.feedback = {};
    $scope.loading = false;
    $scope.identityId = $scope.identityId || svcIdentity.identity.id;
    $scope.account = {
      '@context': payswarm.CONTEXT_URL,
      currency: 'USD',
      psaPublic: []
    };
    $scope.accountVisibility = 'hidden';

    $scope.addAccount = function() {
      $scope.account.psaPublic = [];
      if($scope.accountVisibility === 'public') {
        $scope.account.psaPublic.push('label');
        $scope.account.psaPublic.push('owner');
      }

      $scope.loading = true;
      svcAccount.add(
        $scope.account, $scope.identityId, function(err, account) {
        $scope.loading = false;
        if(!err) {
          $scope.modal.close(null, account);
        }
        $scope.feedback.error = err;
      });
    };
  }

  function Link(scope, element, attrs) {
    scope.feedbackTarget = element;
    attrs.$observe('identity', function(value) {
      value = scope.$eval(value);
      if(value) {
        scope.identityId = value;
      }
    });
  }

  return svcModal.directive({
    name: 'AddAccount',
    scope: {
      showAlert: '@modalAddAccountAlert',
      identityId: '@'
    },
    templateUrl: '/partials/modals/add-account.html',
    controller: Ctrl,
    link: Link
  });
};

return {name: name, deps: deps, factory: factory};
});

})();
