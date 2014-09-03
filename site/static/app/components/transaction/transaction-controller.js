/*!
 * Transaction Controller.
 *
 * @author Manu Sporny
 * @author David I. Lehn
 * @author Dave Longley
 */
define(['jsonld'], function(jsonld) {

'use strict';

/* @ngInject */
function factory(
  $scope, TransactionService, brAlertService, brRefreshService, config) {
  var self = this;

  self.modals = {};
  self.state = {
    txns: TransactionService.state
  };
  self.txn = undefined;

  brRefreshService.register($scope, function(force) {
    var opts = {force: !!force};
    brAlertService.clear();
    TransactionService.collection.getCurrent(opts)
      .then(function(txn) {
        self.txn = txn;
        self.isContract = jsonld.hasValue(txn, 'type', 'Contract');
        self.isDeposit = jsonld.hasValue(txn, 'type', 'Deposit');
        self.isWithdrawal = jsonld.hasValue(txn, 'type', 'Withdrawal');
        $scope.$apply();
      })
      .catch(function(err) {
        brAlertService.add('error', err);
        self.txn = null;
        $scope.$apply();
      });
  })();
}

return {TransactionController: factory};

});
