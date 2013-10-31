/*!
 * Account Selector.
 *
 * @author Dave Longley
 */
define([], function() {

var deps = ['svcAccount', 'svcIdentity'];
return {accountSelector: deps.concat(factory)};

function factory(svcAccount, svcIdentity) {
  function Ctrl($scope) {
    $scope.model = {
      remainingCredit: 0
    };
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

    scope.$watch('selected.balance', update);
    scope.$watch('selected.creditLimit', update);
    scope.$watch('minBalance', update);

    scope.$watch('identity', function(value) {
      if(value) {
        scope.identityId = value;
        updateAccounts(scope);
      }
    });

    function update() {
      // update remaining credit
      scope.model.remainingCredit = 0;
      if(scope.selected) {
        scope.model.remainingCredit = parseFloat(
          scope.selected.creditLimit || '0');
        var balance = parseFloat(scope.selected.balance);
        if(balance < 0) {
          scope.model.remainingCredit += balance;
        }
      }

      // update minimum balance display
      scope.invalid = false;
      scope.balanceTooLow = false;
      scope.instantTransferRequired = false;
      if(scope.selected && scope.minBalance !== undefined) {
        var available = scope.model.remainingCredit +
          parseFloat(scope.selected.balance);
        var minBalance = parseFloat(scope.minBalance);
        if(available < minBalance) {
          // show instant transfer required warning
          var minInstantTransfer = parseFloat(
            scope.selected.psaMinInstantTransfer || 0);
          if(scope.allowInstantTransfer === 'true' &&
            scope.selected.psaAllowInstantTransfer &&
            minInstantTransfer <= minBalance) {
            scope.instantTransferRequired = true;
          }
          else {
            scope.balanceTooLow = true;
            scope.invalid = true;
          }
        }
      }
    }
  }

  return {
    scope: {
      selected: '=',
      invalid: '=',
      fixed: '@',
      minBalance: '@',
      showDepositButton: '@',
      identity: '@',
      instant: '=',
      allowInstantTransfer: '@'
    },
    controller: ['$scope', Ctrl],
    templateUrl: '/partials/account-selector.html',
    link: Link
  };
}

});
