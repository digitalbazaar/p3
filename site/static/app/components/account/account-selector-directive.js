/*!
 * Account Selector.
 *
 * @author Dave Longley
 */
define([], function() {

'use strict';

/* @ngInject */
function accountSelectorInner(AccountService) {
  return {
    restrict: 'A',
    require: 'brSelector',
    link: Link
  };

  function Link(scope, element, attrs, brSelector) {
    var model = scope.model = {};
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

    // configure brSelector
    scope.brSelector = brSelector;
    brSelector.itemType = 'Account';
    brSelector.items = model.accounts;
    brSelector.addItem = function() {
      model.showAddAccountModal = true;
    };
    scope.$watch('fixed', function(value) {
      brSelector.fixed = value;
    });

    AccountService.collection.getAll();
  }
}

/* @ngInject */
function accountSelector() {
  return {
    restrict: 'EA',
    scope: {
      selected: '=psSelected',
      invalid: '=psInvalid',
      fixed: '=?psFixed',
      minBalance: '@psMinBalance',
      showDepositButton: '@psShowDepositButton',
      instant: '=psInstant',
      allowInstantTransfer: '@psAllowInstantTransfer',
      instantTransferDeposit: '=?psInstantTransferDeposit'
    },
    templateUrl: '/app/components/account/account-selector.html'
  };
}

return {
  psAccountSelector: accountSelector,
  psAccountSelectorInner: accountSelectorInner
};

});
