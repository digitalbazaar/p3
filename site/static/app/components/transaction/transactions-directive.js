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
  $timeout, IdentityService, RefreshService, TransactionService) {
  return {
    restrict: 'A',
    scope: {
      account: '=',
      controls: '=',
      details: '=',
      moreHref: '=',
      // recent for all accounts
      recent: '='
    },
    templateUrl: '/app/components/transaction/transactions-view.html',
    link: Link
  };

  function Link(scope) {
    var model = scope.model = {};
    // FIXME update on changes
    model.account = scope.account || null;
    model.recent = scope.recent || false;
    model.controls = scope.controls || false;
    model.details = scope.details || false;
    model.moreHref = scope.moreHref || null;

    // setup default transaction collection
    model.txns = TransactionService.createTxnsCollection({
      finishLoading: _update
    });
    model.state = {
      txns: model.txns.state
    };

    scope.$watch('account', function(account) {
      if(!account || model.recent) {
        return;
      }
      model.account = account;
      model.load();
    });

    // txns expanded with details for table display
    model.table = [];

    model.datePickerOpen = false;
    model.showControls = false;

    function _endOfDay(date) {
      return new Date(
        date.getFullYear(), date.getMonth(), date.getDate(),
        23, 59, 59, 999);
    }

    // convert date into the last millisecond of the day, also separate
    // vars are used to avoid modifying the text while typing and to ensure the
    // input blurs when using the calendar selector
    model.dateChanged = function() {
      if(model.datePickerDate) {
        model.startDate = _endOfDay(model.datePickerDate);
      }
    };

    // lose focus and hide datepicker
    model.dateQuitKeyPressed = function($event) {
      model.datePickerOpen = false;
      $timeout(function() {
        $event.target.blur();
      });
    };

    model.openDatePicker = function() {
      var isOpen = model.datePickerOpen;
      $timeout(function() {
        model.datePickerOpen = !isOpen;
      });
    };

    model.getRowType = TransactionService.getType;

    model.search = function() {
      model.load({
        createdStart: model.startDate.toISOString()
      });
    };

    model.reset = function() {
      // set start date to last ms of today
      model.startDate = _endOfDay(new Date());
      model.datePickerDate = new Date(model.startDate);
      model.limit = 10;
    };

    model.load = function(options) {
      options = options || {};
      // build options for fetching txns
      var params = {
        limit: model.limit
      };
      if(!model.recent && model.account) {
        params.account = model.account.id;
      }
      angular.extend(params, options);

      if(options.createdStart) {
        model.startDate = new Date(options.createdStart);
        model.datePickerDate = new Date(options.createdStart);
      }

      // fetch txns
      model.txns.setQuery(params);
      model.txns.getAll({force: true}).catch(function(err) {
        AlertService.addError(err);
      });
    };

    model.older = function() {
      var options = {};
      // txns exist, get previous page
      if(model.txns.storage.length > 0) {
        var txn = model.txns.storage[model.txns.storage.length - 1];
        options.createdStart = txn.created;
        options.previous = txn.id;
      }
      model.load(options);
    };

    model.newer = function() {
      var options = {};
      // txns exist, get newer page
      if(model.txns.storage.length > 0) {
        var txn = model.txns.storage[0];
        options.createdEnd = txn.created;
        options.previous = txn.id;
      }
      model.load(options);
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

    function _update() {
      // set txn count
      model.txnCount = model.txns.storage.length;
      // clear table
      model.table.splice(0, model.table.length);
      // process each transaction
      angular.forEach(model.txns.storage, function(txn) {
        // skip txns w/insufficent funds
        if(txn.voided &&
          txn.voidReason === 'payswarm.financial.InsufficientFunds') {
          return;
        }

        model.table.push(txn);
        // add transfers if showing details
        if(model.details) {
          var txnIndex = model.table.length - 1;
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
            model.table.push(transfer);
          });
        }
      });
    }

    // reset state
    model.reset();

    // get initial data in recent mode
    if(model.recent) {
      model.load();
    }

    RefreshService.register(scope, model.txns);
  }
}

return {transactions: factory};

});
