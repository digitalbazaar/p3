/*!
 * Account Balance Summary directive. To be paired w/Account Balance Details.
 *
 * @author Dave Longley
 */
define([], function() {

'use strict';

/* @ngInject */
function factory() {
  return {
    restrict: 'A',
    scope: {
      account: '=psAccountBalanceSummary',
      expand: '=psExpand'
    },
    replace: true,
    templateUrl: requirejs.toUrl(
      'p3/components/account/account-balance-summary.html'),
    link: Link
  };

  function Link(scope) {
    var model = scope.model = {};
    scope.$watch('account', function(account) {
      // get balance and credit limit
      model.balance = parseFloat(account ? account.balance : 0);
      model.creditLimit = parseFloat(account ? account.creditLimit || '0' : 0);

      // calculate remaining credit
      model.remainingCredit = model.creditLimit;
      if(model.balance < 0) {
        model.remainingCredit = model.creditLimit + model.balance;
      }

      // get total balance (includes remaining credit)
      model.totalBalance = model.remainingCredit;
      if(model.balance > 0) {
        model.totalBalance += model.balance;
      }
    }, true);
  }
}

return {psAccountBalanceSummary: factory};

});
