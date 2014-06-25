/*!
 * Edit Account Modal.
 *
 * @author Dave Longley
 */
define(['angular', 'payswarm.api'], function(angular, payswarm) {

var deps = ['svcAccount', 'ModalService', 'svcPaymentToken', 'config'];
return {editAccount: deps.concat(factory)};

function factory(svcAccount, ModalService, svcPaymentToken, config) {
  function Ctrl($scope) {
    var model = $scope.model = {};
    $scope.data = config.data || {};
    $scope.feedback = {};
    $scope.loading = false;
    $scope.identity = $scope.data.identity || {};

    // copy account for editing
    $scope.account = angular.copy($scope.sourceAccount);

    // ensure defaults
    $scope.account.sysAllowInstantTransfer =
      !!$scope.account.sysAllowInstantTransfer;
    $scope.account.sysMinInstantTransfer =
      $scope.account.sysMinInstantTransfer || '';
    $scope.account.creditLimit = $scope.account.creditLimit || '0.0000000000';
    $scope.account.creditBackedAmount =
      $scope.account.creditBackedAmount || '0.0000000000';

    var creditLimit = parseFloat($scope.account.creditLimit);
    var backedAmount = parseFloat($scope.account.creditBackedAmount);
    model.fullyBackedCredit = (creditLimit - backedAmount) <= 0;
    model.creditDisabled = !!$scope.account.sysDisabled;

    model.accountVisibility = ($scope.account.sysPublic.length === 0) ?
      'hidden' : 'public';

    // storage for backupSource object
    // backend needs just a list of ids
    // only use first element if there are more than one
    // use sourceAccount object vs copy to use angular ids
    model.backupSource = null;
    model.backupSourceEnabled = false;
    if($scope.sourceAccount.backupSource &&
      $scope.sourceAccount.backupSource[0]) {
      // FIXME: handle errors below or let it use defaults?
      $scope.loading = true;
      model.backupSourceEnabled = true;
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
        sysPublic: [],
        sysAllowInstantTransfer: $scope.account.sysAllowInstantTransfer,
        sysMinInstantTransfer: $scope.account.sysMinInstantTransfer || '0'
      };
      if(model.accountVisibility === 'public') {
        account.sysPublic.push('label');
        account.sysPublic.push('owner');
      }
      // use list of backupSource ids vs objects
      // use empty list if backupSources disabled
      var newBackupSource =
        model.backupSourceEnabled ? [model.backupSource.id] : [];
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

  return ModalService.directive({
    name: 'editAccount',
    scope: {sourceAccount: '=account'},
    templateUrl: '/app/components/account/edit-account-modal.html',
    controller: ['$scope', Ctrl],
    link: function(scope, element, attrs) {
      scope.feedbackTarget = element;
    }
  });
}

});
