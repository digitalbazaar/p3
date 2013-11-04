/*!
 * Add Credit Line Modal.
 *
 * @author Dave Longley
 */
define([], function() {

var deps = ['svcModal'];
return {modalAddCreditLine: deps.concat(factory)};

function factory(svcModal) {
  function Ctrl($scope, svcAccount) {
    $scope.data = window.data || {};
    $scope.feedback = {};

    var model = $scope.model = {};
    model.loading = false;
    // payment backup source for account's credit line
    model.backupSource = null;
    // state in ('reviewing' and 'complete')
    model.state = 'reviewing';

    $scope.confirm = function() {
      model.loading = true;
      svcAccount.addCreditLine(
        $scope.account.id, model.backupSource.id, function(err) {
        model.loading = false;
        if(err) {
          $scope.feedback.contactSupport = true;
          $scope.feedback.error = err;
        }
        else {
          $scope.feedback = {};
          // show complete page
          model.state = 'complete';
        }
        $scope.$apply();
      });
    };
  }

  return svcModal.directive({
    name: 'AddCreditLine',
    scope: {
      account: '='
    },
    templateUrl: '/partials/modals/add-credit-line.html',
    controller: ['$scope', 'svcAccount', Ctrl],
    link: function(scope, element) {
      scope.feedbackTarget = element;
    }
  });
}

});
