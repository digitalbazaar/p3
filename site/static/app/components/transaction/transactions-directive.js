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
  brAlertService, brIdentityService,
  brRefreshService, psTransactionService) {
  return {
    restrict: 'A',
    scope: {
      account: '=psAccount',
      controls: '=psControls',
      details: '=psDetails',
      moreHref: '=psMoreHref',
      // recent for all accounts
      recent: '=psRecent'
    },
    templateUrl: requirejs.toUrl(
      'p3/components/transaction/transactions-view.html'),
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
    model.txns = psTransactionService.createTxnsCollection({
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

    model.showControls = false;

    model.getRowType = psTransactionService.getType;

    model.search = function() {
      model.load({
        createdStart: model.startDate.toISOString()
      });
    };

    model.reset = function() {
      // set start date to last ms of today
      model.startDate = new Date();
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
      }

      // fetch txns
      model.txns.setQuery(params);
      model.txns.getAll({force: true}).catch(function(err) {
        brAlertService.add('error', err);
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
              if(src.owner === brIdentityService.identity.id) {
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
              if(dst.owner === brIdentityService.identity.id &&
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

    brRefreshService.register(scope, model.txns);
  }
}

return {psTransactions: factory};

});
