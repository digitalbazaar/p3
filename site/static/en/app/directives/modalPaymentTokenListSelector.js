/*!
 * Payment Token List Selector.
 *
 * @author Digital Bazaar
 */
define([], function() {

var deps = ['svcModal'];
return {modalPaymentTokenListSelector: deps.concat(factory)};

function factory(svcModal) {
  function Ctrl($scope, svcAccount) {
    $scope.data = window.data || {};
    $scope.feedback = {};

    var model = $scope.model = {};
    model.loading = false;
    // payment backup source selected
    model.backupSource = null;

    $scope.confirm = function() {
      model.loading = true;
      svcAccount.addBackupSource(
        $scope.account.id, model.backupSource.id, function(err) {
        model.loading = false;
        if(!err) {
          $scope.modal.close(null);
        }
        $scope.feedback.error = err;
      });
    };
  }

  return svcModal.directive({
    name: 'PaymentTokenListSelector',
    scope: {
      account: '='
    },
    templateUrl: '/partials/modals/payment-token-list-selector.html',
    controller: ['$scope', 'svcAccount', Ctrl],
    link: function(scope, element) {
      scope.feedbackTarget = element;
    }
  });
}

});
