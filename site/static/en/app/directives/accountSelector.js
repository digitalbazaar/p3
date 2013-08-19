/*!
 * Account Selector.
 *
 * @author Dave Longley
 */
(function() {

define([], function() {

var name = 'accountSelector';
var deps = ['svcAccount', 'svcIdentity'];
var factory = function(svcAccount, svcIdentity) {
  function Ctrl($scope) {
    $scope.model = {};
    $scope.services = {
      account: svcAccount.state
    };
    $scope.identityId = svcIdentity.identity.id;
    updateAccounts($scope);
    $scope.$watch('accounts', function(accounts) {
      if(!accounts) {
        return;
      }
      if(!$scope.selected || $.inArray($scope.selected, accounts) === -1) {
        $scope.selected = accounts[0] || null;
      }
    }, true);
  }

  function updateAccounts($scope) {
    var identityId = $scope.identityId;
    svcAccount.get({identity: identityId}, function(err, accounts) {
      $scope.accounts = accounts;
    });
  }

  function Link(scope, element, attrs) {
    attrs.$observe('fixed', function(value) {
      scope.fixed = value;
    });

    scope.$watch('selected.balance', function(value) {
      scope.invalid = false;
      scope.balanceTooLow = false;
      if(value && scope.minBalance !== undefined) {
        if(parseFloat(value) < parseFloat(scope.minBalance)) {
          scope.balanceTooLow = true;
          scope.invalid = true;
        }
      }
    });

    scope.$watch('minBalance', function(value) {
      scope.invalid = false;
      scope.balanceTooLow = false;
      if(scope.selected && value !== undefined) {
        if(parseFloat(scope.selected.balance) < parseFloat(value)) {
          scope.balanceTooLow = true;
          scope.invalid = true;
        }
      }
    });

    scope.$watch('identity', function(value) {
      if(value) {
        scope.identityId = value;
        updateAccounts(scope);
      }
    });
  }

  return {
    scope: {
      selected: '=',
      invalid: '=',
      fixed: '@',
      minBalance: '@',
      showDepositButton: '@',
      identity: '@',
      instant: '='
    },
    controller: Ctrl,
    templateUrl: '/partials/account-selector.html',
    link: Link
  };
};

return {name: name, deps: deps, factory: factory};
});

})();
