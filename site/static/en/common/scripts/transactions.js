/*!
 * Account Activity
 *
 * @author Dave Longley
 */
// FIXME: use RequireJS AMD format
(function() {

var module = angular.module('activity', ['payswarm', 'ui']).
run(function() {
});

module.controller('ActivityCtrl', function($scope) {
  // initialize model
  var data = window.data || {};
  $scope.session = data.session || null;
  $scope.identity = data.identity || null;
  $scope.account = data.account || null;
  $scope.txns = [];
  $scope.table = [];
  $scope.error = null;
  $scope.loading = false;

  // set start date to last ms of today
  var now = new Date();
  $scope.startDate = new Date(
    now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  $scope.textDate = $scope.startDate.toString();

  // convert the text date into the last millisecond of the day, also
  // separate model vars are used to avoid modifying the text while
  // typing and to ensure the input blurs when using the calendar selector
  $scope.dateChanged = function() {
    var d = new Date($scope.textDate);
    if(!isNaN(+d)) {
      $scope.startDate = new Date(
        d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      $scope.txns = [];
      $scope.table = [];
      $scope.getMore();
    }
  };

  // lose focus and hide datepicker
  $scope.dateQuitKeyPressed = function($event) {
    $($event.target).datepicker('hide');
    $event.target.blur();
  };

  $scope.getRowType = function(row) {
    if(row.type.indexOf('com:Deposit') !== -1) {
      return 'deposit';
    }
    else if(row.type.indexOf('ps:Contract') !== -1) {
      return 'contract';
    }
    else if(row.type.indexOf('com:Transfer') !== -1) {
      return 'transfer';
    }
    else {
      return 'error';
    }
  };

  $scope.getMore = function() {
    // show loading indicator
    $scope.loading = true;

    // build options for fetching txns
    var options = {};
    if($scope.account) {
      options.account = $scope.account.id;
    }
    // previous txns exist, get next page
    if($scope.txns.length > 0) {
      var txn = $scope.txns[$scope.txns.length - 1];
      options.createdStart = txn.created;
      options.previous = txn.id;
    }
    else {
      options.createdStart = $scope.startDate;
    }
    options.success = function(txns) {
      $scope.error = null;
      txns.forEach(function(txn) {
        _addTxn($scope, txn);
      });
      $scope.loading = false;
      $scope.$apply();
    };
    options.error = function(err) {
      // FIXME: show error
      console.log('ERROR', err);
      $scope.error = err;
      $scope.loading = false;
      $scope.$apply();
    };

    // fetch txns
    payswarm.transactions.get(options);
  };

  // show/hide transaction details
  $scope.toggleDetails = function(row) {
    var txn = row;
    if(row.type.indexOf('com:Transfer') !== -1) {
      txn = row.txn;
    }
    txn.transfer.forEach(function(transfer) {
      transfer.hidden = !transfer.hidden;
    });
  };

  // populate table with first set of txns
  $scope.getMore();
});

// adds a txn to the model
function _addTxn($scope, txn) {
  $scope.txns.push(txn);
  $scope.table.push(txn);
  txn.transfer.forEach(function(transfer) {
    transfer.txn = txn;
    transfer.sourceLink = true;
    transfer.destinationLink = true;
    if(txn.source) {
      var src = txn.source;
      if(src.paymentMethod === 'ccard:CreditCard') {
        transfer.source = 'Credit Card: ' + src.cardNumber;
        transfer.sourceLink = false;
      }
      else if(src.paymentMethod === 'bank:BankAccount') {
        transfer.source = 'Bank Account: ' + src.bankAccount;
        transfer.sourceLink = false;
      }
    }
    else if(txn.destination) {
      var dst = txn.destination;
      if(dst.paymentMethod === 'bank:BankAccount') {
        transfer.destination = 'Bank Account: ' + dst.bankAccount;
        transfer.destinationLink = false;
      }
    }
    transfer.hidden = true;
    $scope.table.push(transfer);
  });
}

})();
