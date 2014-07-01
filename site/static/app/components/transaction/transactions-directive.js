/*!
 * Transactions directive.
 *
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 * @author David I. Lehn
 */
define([], function() {

'use strict';

var deps = ['TransactionService'];
return {transactions: deps.concat(factory)};

function factory(TransactionService) {
  function Ctrl($scope) {
    var model = $scope.model = {};
    model.txns = TransactionService.recentTxns;
    model.state = {
      txns: TransactionService.state.recent
    };
    model.modals = {};

    model.getTxnType = TransactionService.getType;

    TransactionService.getRecent();
  }

  return {
    scope: {},
    controller: ['$scope', Ctrl],
    templateUrl: '/app/components/transaction/transactions-view.html'
  };
}

});
