/*!
 * Add Account Modal.
 *
 * @author Dave Longley
 */
define(['payswarm.api'], function(payswarm) {

var deps = ['svcModal', 'svcIdentity', 'svcAccount'];
return {modalAddAccount: deps.concat(factory)};

function factory(svcModal, svcIdentity, svcAccount) {
  function Ctrl($scope) {
    $scope.model = {};
    $scope.data = window.data || {};
    $scope.feedback = {};
    $scope.loading = false;
    $scope.identityId = $scope.identityId || svcIdentity.identity.id;
    $scope.account = {
      '@context': payswarm.CONTEXT_URL,
      currency: 'USD',
      sysPublic: []
    };
    $scope.model.accountVisibility = 'hidden';

    $scope.addAccount = function() {
      $scope.account.sysPublic = [];
      if($scope.model.accountVisibility === 'public') {
        $scope.account.sysPublic.push('label');
        $scope.account.sysPublic.push('owner');
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
    templateUrl: '/app/components/account/add-account-modal.html',
    controller: ['$scope', Ctrl],
    link: Link
  });
}

});
