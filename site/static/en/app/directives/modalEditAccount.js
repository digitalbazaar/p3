/*!
 * Edit Account Modal.
 *
 * @author Dave Longley
 */
define(['angular', 'payswarm.api'], function(angular, payswarm) {

var deps = ['svcModal', 'svcAccount'];
return {modalEditAccount: deps.concat(factory)};

function factory(svcModal, svcAccount) {
  function Ctrl($scope) {
    $scope.model = {};
    $scope.data = window.data || {};
    $scope.feedback = {};
    $scope.loading = false;
    $scope.identity = $scope.data.identity || {};

    // copy account for editing
    $scope.account = {};
    angular.extend($scope.account, $scope.sourceAccount);

    $scope.accountVisibility = ($scope.account.psaPublic.length === 0) ?
      'hidden' : 'public';
    $scope.editing = true;

    $scope.editAccount = function() {
      var account = {
        '@context': payswarm.CONTEXT_URL,
        id: $scope.account.id,
        label: $scope.account.label,
        psaPublic: []
      };
      if($scope.accountVisibility === 'public') {
        account.psaPublic.push('label');
        account.psaPublic.push('owner');
      }

      $scope.loading = true;
      svcAccount.update(account, function(err, account) {
        $scope.loading = false;
        if(!err) {
          $scope.modal.close(null, account);
        }
        $scope.feedback.error = err;
      });
    };
  }

  return svcModal.directive({
    name: 'EditAccount',
    scope: {sourceAccount: '=account'},
    templateUrl: '/partials/modals/edit-account.html',
    controller: Ctrl,
    link: function(scope, element, attrs) {
      scope.feedbackTarget = element;
    }
  });
}

});
