/*!
 * Transactions directive.
 *
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 * @author David I. Lehn
 */
define(['angular', 'jsonld'], function(angular, jsonld) {

'use strict';

/* @ngInject */
function factory(
  $timeout, IdentityService, ModelService, RefreshService,
  TransactionService) {
  return {
    scope: {
      account: '=',
      controls: '=',
      details: '=',
      moreMode: '=',
      recent: '='
    },
    templateUrl: '/app/components/transaction/transactions-view.html',
    link: Link
  };

  function Link(scope) {
    var model = scope.model = {};
    // FIXME update on changes
    model.controls = scope.controls || false;
    model.details = scope.details || false;
    model.moreMode = scope.moreMode || 'load';
    model.recent = scope.recent || false;
    model.limit = 10;

    var query = {};
    if(model.recent) {
      query.limit = 10;
    }
    if(scope.account) {
      query.account = scope.account.id;
    }
    // setup default transaction collection
    model.txns = TransactionService.createTxnsCollection({
      finishLoading: _updateTable
    });
    model.state = {
      txns: model.txns.state
    };

    scope.$watch('account', function(account, oldAccount) {
      if(account !== oldAccount) {
        model.txns.clear();
      }
      if(typeof account === 'undefined') {
        return;
      }
      model.getMore();
    });

    // txns expanded with details for table display
    model.table = [];

    model.datePickerOpen = false;
    model.showControls = false;

    // set start date to last ms of today
    var now = new Date();
    model.startDate = new Date(
      now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    model.datePickerDate = new Date(model.startDate);

    // convert date into the last millisecond of the day, also separate
    // vars are used to avoid modifying the text while typing and to ensure the
    // input blurs when using the calendar selector
    model.dateChanged = function() {
      if(model.datePickerDate) {
        model.startDate = new Date(
          model.datePickerDate.getFullYear(),
          model.datePickerDate.getMonth(),
          model.datePickerDate.getDate(), 23, 59, 59, 999);
        model.getMore();
      }
    };

    // lose focus and hide datepicker
    model.dateQuitKeyPressed = function($event) {
      model.datePickerOpen = false;
      $event.target.blur();
    };

    model.openDatePicker = function() {
      var isOpen = model.datePickerOpen;
      $timeout(function() {
        model.datePickerOpen = !isOpen;
      });
    };

    model.getRowType = TransactionService.getType;

    model.getMore = function() {
      // build options for fetching txns
      var params = {
        limit: model.limit
      };
      if(scope.account) {
        params.account = scope.account.id;
      }
      // previous txns exist, get next page
      if(model.txns.storage.length > 0) {
        var txn = model.txns.storage[model.txns.storage.length - 1];
        params.createdStart = txn.created;
        params.previous = txn.id;
      } else {
        params.createdStart = model.startDate;
      }
      if(params.createdStart instanceof Date) {
        params.createdStart = (+params.createdStart / 1000);
      }

      // fetch txns
      model.txns.setQuery(params);
      model.txns.getAll({force: true}).catch(function(err) {
        AlertService.addError(err);
      });
    };

    // show/hide transaction details
    model.toggleDetails = function(row) {
      // skip if not in details mode
      if(!model.details) {
        return;
      }
      var txn = row;
      if(jsonld.hasValue(row, 'type', 'Transfer')) {
        // indexing used to avoid circular references
        txn = model.table[row.txn.index];
      }
      txn.detailsVisible = !txn.detailsVisible;
      txn.transfer.forEach(function(transfer) {
        transfer.hidden = !transfer.hidden;
      });
    };

    function _updateTable() {
      var table = [];
      angular.forEach(model.txns.storage, function(txn) {
        // skip txns w/insufficent funds
        if(txn.voided &&
          txn.voidReason === 'payswarm.financial.InsufficientFunds') {
          return;
        }

        table.push(txn);
        // add transfers if showing details
        if(model.details) {
          var txnIndex = table.length - 1;
          angular.forEach(txn.transfer, function(transfer) {
            // denormalized data and indexing used to avoid circular references
            transfer.txn = {
              index: txnIndex,
              settled: txn.settled,
              voided: txn.voided
            };
            transfer.sourceLink = true;
            transfer.destinationLink = true;
            if(txn.source && txn.source.id === transfer.source) {
              var src = txn.source;
              transfer.sourceLink = false;
              transfer.source = src.label;
              if(src.owner === IdentityService.identity.id) {
                if(src.paymentMethod === 'CreditCard') {
                  transfer.source += ' (Credit Card: ' + src.cardNumber + ')';
                } else if(src.paymentMethod === 'BankAccount') {
                  transfer.source += ' (Bank Account: ' + src.bankAccount + ')';
                }
              }
            }
            if(txn.destination && txn.destination.id === transfer.destination) {
              var dst = txn.destination;
              transfer.destinationLink = false;
              transfer.destination = dst.label;
              if(dst.owner === IdentityService.identity.id &&
                dst.paymentMethod === 'BankAccount') {
                transfer.destination +=
                  ' (Bank Account: ' + dst.bankAccount + ')';
              }
            }
            transfer.hidden = true;
            table.push(transfer);
          });
        }
      });
      ModelService.replaceArray(model.table, table);
      scope.$apply();
    }

    RefreshService.register(scope, model.txns);
  }
}

return {transactions: factory};

});
