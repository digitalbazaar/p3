/*!
 * Account Activity Controller.
 *
 * @author Dave Longley
 */
define(['angular'], function(angular) {

var deps = [
  '$timeout',
  'AlertService', 'IdentityService', 'ResourceService',
  'ServiceTransaction', 'config'];
return {ActivityCtrl: deps.concat(factory)};

function factory(
  $timeout, AlertService, IdentityService, ResourceService,
  ServiceTransaction, config) {
  var self = this;
  self.identity = IdentityService.identity;
  self.session = config.data.session || null;
  self.account = config.data.account || null;
  self.txns = new ResourceService.Collection({
    url: '/transactions',
    finishLoading: _updateTable
  });
  _updateTable();
  self.datePickerOpen = false;

  // set start date to last ms of today
  var now = new Date();
  self.startDate = new Date(
    now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  self.datePickerDate = new Date(self.startDate);

  // convert date into the last millisecond of the day, also separate
  // vars are used to avoid modifying the text while typing and to ensure the
  // input blurs when using the calendar selector
  self.dateChanged = function() {
    if(self.datePickerDate) {
      self.startDate = new Date(
        self.datePickerDate.getFullYear(),
        self.datePickerDate.getMonth(),
        self.datePickerDate.getDate(), 23, 59, 59, 999);
      self.txns = new ResourceService.Collection({
        url: '/transactions',
        finishLoading: _updateTable
      });
      self.getMore();
    }
  };

  // lose focus and hide datepicker
  self.dateQuitKeyPressed = function($event) {
    self.datePickerOpen = false;
    $event.target.blur();
  };

  self.openDatePicker = function() {
    var isOpen = self.datePickerOpen;
    $timeout(function() {
      self.datePickerOpen = !isOpen;
    });
  };

  self.getRowType = TransactionService.getType;

  self.getMore = function() {
    // build options for fetching txns
    var params = {};
    if(self.account) {
      params.account = self.account.id;
    }
    // previous txns exist, get next page
    if(self.txns.storage.length > 0) {
      var txn = self.txns.storage[self.txns.storage.length - 1];
      params.createdStart = txn.created;
      params.previous = txn.id;
    } else {
      params.createdStart = self.startDate;
    }
    if(params.createdStart instanceof Date) {
      params.createdStart = (+params.createdStart / 1000);
    }

    // fetch txns
    self.txns.getAll({params: params}).catch(function(err) {
      AlertService.addError(err);
    });
  };

  // show/hide transaction details
  self.toggleDetails = function(row) {
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
  self.getMore();

  function _updateTable() {
    self.table = [];
    angular.forEach(self.txns.storage, function(txn) {
      // skip txns w/insufficent funds
      if(txn.voided &&
        txn.voidReason === 'payswarm.financial.InsufficientFunds') {
        return;
      }

      self.table.push(txn);
      angular.forEach(txn.transfer, function(transfer) {
        transfer.txn = txn;
        transfer.sourceLink = true;
        transfer.destinationLink = true;
        if(txn.source && txn.source.id === transfer.source) {
          var src = txn.source;
          transfer.sourceLink = false;
          transfer.source = src.label;
          if(src.owner === self.identity.id) {
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
          if(dst.owner === self.identity.id &&
            dst.paymentMethod === 'BankAccount') {
            transfer.destination +=
              ' (Bank Account: ' + dst.bankAccount + ')';
          }
        }
        transfer.hidden = true;
        self.table.push(transfer);
      });
    });
  }
}

});
