/*!
 * Account Selector.
 *
 * @author Dave Longley
 */
define([], function() {

'use strict';

/* @ngInject */
function factory(AccountService, PaymentTokenService) {
  return {
    restrict: 'A',
    scope: {
      selected: '=psSelected',
      invalid: '=psInvalid',
      fixed: '@psFixed',
      minBalance: '@psMinBalance',
      showDepositButton: '@psShowDepositButton',
      instant: '=psInstant',
      allowInstantTransfer: '@psAllowInstantTransfer',
      instantTransferDeposit: '=?psInstantTransferDeposit'
    },
    templateUrl: '/app/components/account/account-selector.html',
    link: Link
  };

  function Link(scope, element, attrs) {
    var model = scope.model = {};
    model.remainingCredit = 0;
    model.paymentMethodIsCollapsed = true;
    model.showAddAccount = false;
    model.showDepostModal = false;
    model.showEditAccount = false;
    model.state = AccountService.state;
    model.accounts = AccountService.accounts;

    scope.$watch(function() {
      return model.accounts;
    }, function(accounts) {
      if(!accounts) {
        return;
      }
      if(!scope.selected || $.inArray(scope.selected, accounts) === -1) {
        scope.selected = accounts[0] || null;
      }
    }, true);

    attrs.$observe('psFixed', function(value) {
      scope.fixed = value;
    });

    scope.$watch('selected.balance', update);
    scope.$watch('selected.creditLimit', update);
    scope.$watch('selected.backupSource', update);
    scope.$watch('minBalance', update);
    scope.$watch('instantTransferDeposit', update, true);

    function update() {
      // update remaining credit
      model.remainingCredit = 0;
      if(scope.selected) {
        if(scope.selected.sysCreditDisabled) {
          model.remainingCredit = 0;
        } else {
          model.remainingCredit = parseFloat(scope.selected.creditLimit || '0');
        }
        var balance = parseFloat(scope.selected.balance);
        if(balance < 0) {
          model.remainingCredit += balance;
        }
      }

      // update minimum balance display
      scope.invalid = false;
      model.balanceTooLow = false;
      model.instantTransferRequired = false;
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
            model.instantTransferRequired = true;
          } else {
            model.balanceTooLow = true;
            scope.invalid = true;
          }
        }
      }

      // get backup source token
      model.backupSource = null;
      if(scope.selected) {
        var account = scope.selected;
        if(account.backupSource && account.backupSource.length) {
          model.backupSource = PaymentTokenService.find(
            account.backupSource[0]);
        }
      }
    }

    AccountService.collection.getAll();
  }
}

return {psAccountSelector: factory};

});
