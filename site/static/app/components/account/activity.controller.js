/*!
 * Account Activity Controller.
 *
 * @author Dave Longley
 */
define(['angular'], function(angular) {

var deps = [
  '$scope', '$timeout', 'config',
  'svcAlert', 'svcIdentity', 'svcResource', 'svcTransaction'];
return {ActivityCtrl: deps.concat(factory)};

function factory(
  $scope, $timeout, config,
  svcAlert, svcIdentity, svcResource, svcTransaction) {
  var model = this;
  model.identity = svcIdentity.identity;
  model.session = config.data.session || null;
  model.account = config.data.account || null;
  model.txns = new svcResource.Collection({
    url: '/transactions',
    finishLoading: _updateTable
  });
  _updateTable();
  model.error = null;
  model.datePickerOpen = false;

  // set start date to last ms of today
  var now = new Date();
  model.startDate = new Date(
    now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  model.datePickerDate = new Date(model.startDate);

  // convert date into the last millisecond of the day, also separate model
  // vars are used to avoid modifying the text while typing and to ensure the
  // input blurs when using the calendar selector
  model.dateChanged = function() {
    if(model.datePickerDate) {
      model.startDate = new Date(
        model.datePickerDate.getFullYear(),
        model.datePickerDate.getMonth(),
        model.datePickerDate.getDate(), 23, 59, 59, 999);
      model.txns = new svcResource.Collection({
        url: '/transactions',
        finishLoading: _updateTable
      });
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

  model.getRowType = svcTransaction.getType;

  model.getMore = function() {
    // build options for fetching txns
    var params = {};
    if(model.account) {
      params.account = model.account.id;
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
    model.txns.getAll({params: params}).catch(function(err) {
      svcAlert.addError(err);
    });
  };

  // show/hide transaction details
  model.toggleDetails = function(row) {
    var txn = row;
    if(row.type.indexOf('Transfer') !== -1) {
      txn = row.txn;
    }
    txn.detailsVisible = !txn.detailsVisible;
    txn.transfer.forEach(function(transfer) {
      transfer.hidden = !transfer.hidden;
    });
  };

  // populate table with first set of txns
  model.getMore();

  function _updateTable() {
    model.table = [];
    angular.forEach(model.txns.storage, function(txn) {
      // skip txns w/insufficent funds
      if(txn.voided &&
        txn.voidReason === 'payswarm.financial.InsufficientFunds') {
        return;
      }

      model.table.push(txn);
      angular.forEach(txn.transfer, function(transfer) {
        transfer.txn = txn;
        transfer.sourceLink = true;
        transfer.destinationLink = true;
        if(txn.source && txn.source.id === transfer.source) {
          var src = txn.source;
          transfer.sourceLink = false;
          transfer.source = src.label;
          if(src.owner === model.identity.id) {
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
          if(dst.owner === model.identity.id &&
            dst.paymentMethod === 'BankAccount') {
            transfer.destination +=
              ' (Bank Account: ' + dst.bankAccount + ')';
          }
        }
        transfer.hidden = true;
        model.table.push(transfer);
      });
    });
  }
}

});
