/*!
 * Update Account Button Directive.
 *
 * @author Dave Longley
 */
define(['payswarm.api'], function(payswarm) {

var deps = ['svcAccount'];
return {updateAccountButton: deps.concat(factory)};

function factory(svcAccount) {
  function Ctrl($scope) {
    $scope.data = window.data || {};
    $scope.feedback = {};

    var model = $scope.model = {};
    model.loading = false;
    model.identity = $scope.data.identity || {};

    $scope.updateAccount = function() {
      // merge in all properties from given account
      var account = {
        '@context': payswarm.CONTEXT_URL,
        id: $scope.account.id
      };
      $scope.account.forEach(function(property) {
        account[property] = $scope.account[property];
      });

      model.loading = true;
      svcAccount.update(account, function(err, account) {
        model.loading = false;
        $scope.feedback.error = err;
        $scope.callback(err, account);
      });
    };
  }

  return {
    scope: {
      account: '=',
      callback: '&'
    },
    templateUrl: '/partials/update-account-button.html',
    controller: ['$scope', Ctrl],
    link: function(scope, element) {
      scope.feedbackTarget = element;
    }
  };
}

});
