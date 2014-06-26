/*!
 * Account Selector.
 *
 * @author Dave Longley
 */
define([], function() {

var deps = ['AccountService', 'IdentityService', 'PaymentTokenService'];
return {accountSelector: deps.concat(factory)};

function factory(AccountService, IdentityService, PaymentTokenService) {
  return {
    scope: {
      selected: '=',
      invalid: '=',
      fixed: '@',
      minBalance: '@',
      showDepositButton: '@',
      instant: '=',
      allowInstantTransfer: '@',
      instantTransferDeposit: '=?'
    },
    templateUrl: '/app/components/account/account-selector.html',
    link: Link
  };

  function Link(scope, element, attrs) {
    // FIXME: be consistent with use of 'model'
    scope.model = {
      remainingCredit: 0,
      paymentMethodIsCollapsed: true,
      showEditAccount: false
    };
    scope.services = {
      account: AccountService.state
    };
    scope.identityId = IdentityService.identity.id;
    scope.accounts = AccountService.collection.storage;
    scope.$watch('accounts', function(accounts) {
      if(!accounts) {
        return;
      }
      if(!scope.selected || $.inArray(scope.selected, accounts) === -1) {
        scope.selected = accounts[0] || null;
      }
    }, true);

    attrs.$observe('fixed', function(value) {
      scope.fixed = value;
    });

    scope.$watch('selected.balance', update);
    scope.$watch('selected.creditLimit', update);
    scope.$watch('selected.backupSource', update);
    scope.$watch('minBalance', update);
    scope.$watch('instantTransferDeposit', update, true);

    function update() {
      // update remaining credit
      scope.model.remainingCredit = 0;
      if(scope.selected) {
        if(scope.selected.sysCreditDisabled) {
          scope.model.remainingCredit = 0;
        } else {
          scope.model.remainingCredit = parseFloat(
            scope.selected.creditLimit || '0');
        }
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
        var max =
          parseFloat(scope.selected.creditLimit || '0') +
          parseFloat(scope.selected.balance);
        var minBalance = parseFloat(scope.minBalance);
        if(max < minBalance) {
          // show instant transfer required warning
          var minInstantTransfer = parseFloat(
            scope.selected.sysMinInstantTransfer || 0);
          if(scope.allowInstantTransfer === 'true' &&
            scope.selected.sysAllowInstantTransfer &&
            minInstantTransfer <= minBalance) {
            scope.instantTransferRequired = true;
          } else {
            scope.balanceTooLow = true;
            scope.invalid = true;
          }
        }
      }

      // get backup source token
      scope.model.backupSource = null;
      if(scope.selected) {
        var account = scope.selected;
        if(account.backupSource && account.backupSource.length) {
          scope.model.backupSource = PaymentTokenService.find(
            account.backupSource[0]);
        }
      }
    }
  }
}

});
