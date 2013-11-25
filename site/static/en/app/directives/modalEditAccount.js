/*!
 * Edit Account Modal.
 *
 * @author Dave Longley
 */
define(['angular', 'payswarm.api'], function(angular, payswarm) {

var deps = ['svcModal'];
return {modalEditAccount: deps.concat(factory)};

function factory(svcModal) {
  function Ctrl($scope, svcAccount, svcPaymentToken) {
    var model = $scope.model = {};
    $scope.data = window.data || {};
    $scope.feedback = {};
    $scope.loading = false;
    $scope.identity = $scope.data.identity || {};

    // copy account for editing
    $scope.account = angular.copy($scope.sourceAccount);

    model.accountVisibility = ($scope.account.psaPublic.length === 0) ?
      'hidden' : 'public';
    // storage for backupSource object
    // backend needs just a list of ids
    // only use first element if there are more than one
    // use sourceAccount object vs copy to use angular ids
    model.backupSource = null;
    if($scope.sourceAccount.backupSource[0]) {
      // FIXME: handle errors below or let it use defaults?
      $scope.loading = true;
      svcPaymentToken.get(function(err) {
        $scope.loading = false;
        if(err) {
          return;
        }
        svcPaymentToken.find(
          $scope.sourceAccount.backupSource[0], function(err, token) {
          if(!err) {
            model.backupSource = token;
          }
        });
      });
    }
    $scope.showExpirationWarning = false;
    $scope.showExpired = false;
    $scope.editing = true;

    $scope.editAccount = function() {
      var account = {
        '@context': payswarm.CONTEXT_URL,
        id: $scope.account.id,
        label: $scope.account.label,
        psaPublic: []
      };
      if(model.accountVisibility === 'public') {
        account.psaPublic.push('label');
        account.psaPublic.push('owner');
      }
      // use list of backupSource ids vs objects
      var newBackupSource = [model.backupSource.id];
      // let server handle add/del operations
      if(!angular.equals($scope.sourceAccount.backupSource, newBackupSource)) {
        account.backupSource = newBackupSource;
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
    controller: ['$scope', 'svcAccount', 'svcPaymentToken', Ctrl],
    link: function(scope, element, attrs) {
      scope.feedbackTarget = element;
    }
  });
}

});
