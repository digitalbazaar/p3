/*!
 * Account Selection Display.
 *
 * @author Digital Bazaar
 */
define([], function() {

'use strict';

/* @ngInject */
function factory(PaymentTokenService) {
  return {
    restrict: 'E',
    scope: {
      account: '=psAccount',
      select: '&?psSelect',
      minBalance: '@psMinBalance',
      showDepositButton: '@psShowDepositButton',
      instant: '=psInstant',
      allowInstantTransfer: '@psAllowInstantTransfer',
      instantTransferDeposit: '=?psInstantTransferDeposit'
    },
    templateUrl: '/app/components/account/account-selection.html',
    link: Link
  };

  function Link(scope) {
    var model = scope.model = {};
    model.remainingCredit = 0;
    model.paymentMethodIsCollapsed = true;
    model.showDepositModal = false;
    model.showEditAccount = false;

    scope.$watch('account.balance', update);
    scope.$watch('account.creditLimit', update);
    scope.$watch('account.backupSource', update);
    scope.$watch('minBalance', update);
    scope.$watch('instantTransferDeposit', update, true);

    function update() {
      // update remaining credit
      model.remainingCredit = 0;
      if(scope.account) {
        if(scope.account.sysCreditDisabled) {
          model.remainingCredit = 0;
        } else {
          model.remainingCredit = parseFloat(scope.account.creditLimit || '0');
        }
        var balance = parseFloat(scope.account.balance);
        if(balance < 0) {
          model.remainingCredit += balance;
        }
      }

      // update minimum balance display
      scope.invalid = false;
      model.balanceTooLow = false;
      model.instantTransferRequired = false;
      if(scope.account && scope.minBalance !== undefined) {
        var max =
          parseFloat(scope.account.creditLimit || '0') +
          parseFloat(scope.account.balance);
        var minBalance = parseFloat(scope.minBalance);
        if(max < minBalance) {
          // show instant transfer required warning
          var minInstantTransfer = parseFloat(
            scope.account.sysMinInstantTransfer || 0);
          if(scope.allowInstantTransfer === 'true' &&
            scope.account.sysAllowInstantTransfer &&
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
      if(scope.account) {
        var account = scope.account;
        if(account.backupSource && account.backupSource.length) {
          model.backupSource = PaymentTokenService.find(
            account.backupSource[0]);
        }
      }
    }
  }
}

return {psAccountSelection: factory};

});
