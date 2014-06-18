/*!
 * Account Activity Controller.
 *
 * @author Dave Longley
 */
define(['angular', 'payswarm.api'], function(angular, payswarm) {

var deps = ['$scope', '$timeout', 'svcTransaction'];
return {ActivityCtrl: deps.concat(factory)};

function factory($scope, $timeout, svcTransaction) {
  $scope.model = {};
  var data = window.data || {};
  $scope.session = data.session || null;
  $scope.account = data.account || null;
  $scope.txns = [];
  $scope.table = [];
  $scope.error = null;
  $scope.loading = false;
  $scope.datePickerOpen = false;

  // set start date to last ms of today
  var now = new Date();
  $scope.startDate = new Date(
    now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  $scope.datePickerDate = new Date($scope.startDate);

  // convert date into the last millisecond of the day, also separate model
  // vars are used to avoid modifying the text while typing and to ensure the
  // input blurs when using the calendar selector
  $scope.dateChanged = function() {
    if($scope.datePickerDate) {
      $scope.startDate = new Date(
        $scope.datePickerDate.getFullYear(),
        $scope.datePickerDate.getMonth(),
        $scope.datePickerDate.getDate(), 23, 59, 59, 999);
      $scope.txns = [];
      $scope.table = [];
      $scope.getMore();
    }
  };

  // lose focus and hide datepicker
  $scope.dateQuitKeyPressed = function($event) {
    $scope.datePickerOpen = false;
    $event.target.blur();
  };

  $scope.openDatePicker = function() {
    var isOpen = $scope.datePickerOpen;
    $timeout(function() {
      $scope.datePickerOpen = !isOpen;
    });
  };

  $scope.getRowType = svcTransaction.getType;

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
    } else {
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
      console.log('getMore:', err);
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
    if(row.type.indexOf('Transfer') !== -1) {
      txn = row.txn;
    }
    txn.detailsVisible = !txn.detailsVisible;
    txn.transfer.forEach(function(transfer) {
      transfer.hidden = !transfer.hidden;
    });
  };

  // populate table with first set of txns
  $scope.getMore();
}

// adds a txn to the model
function _addTxn($scope, txn) {
  // skip txns w/insufficent funds
  if(txn.voided && txn.voidReason === 'payswarm.financial.InsufficientFunds') {
    return;
  }

  $scope.txns.push(txn);
  $scope.table.push(txn);
  angular.forEach(txn.transfer, function(transfer) {
    transfer.txn = txn;
    transfer.sourceLink = true;
    transfer.destinationLink = true;
    if(txn.source && txn.source.id === transfer.source) {
      var src = txn.source;
      transfer.sourceLink = false;
      transfer.source = src.label;
      if(src.owner === $scope.session.identity.id) {
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
      if(dst.owner === $scope.session.identity.id) {
        if(dst.paymentMethod === 'BankAccount') {
          transfer.destination += ' (Bank Account: ' + dst.bankAccount + ')';
        }
      }
    }
    transfer.hidden = true;
    $scope.table.push(transfer);
  });
}

});
