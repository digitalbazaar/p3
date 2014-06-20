/*!
 * Account Activity Controller.
 *
 * @author Dave Longley
 */
define(['angular'], function(angular) {

var deps = [
  '$scope', '$timeout', 'config',
  'svcIdentity', 'svcResource', 'svcTransaction'];
return {ActivityCtrl: deps.concat(factory)};

function factory(
  $scope, $timeout, config, svcIdentity, svcResource, svcTransaction) {
  var model = $scope.model = {};
  var identity = svcIdentity.identity;
  $scope.session = data.session || null;
  $scope.account = data.account || null;
  $scope.txns = new svcResource.Collection({
    url: '/transactions',
    finishLoading: _updateTable
  });
  _updateTable();
  $scope.error = null;
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
      $scope.txns = new svcResource.Collection({
        url: '/transactions',
        finishLoading: _updateTable
      });
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
    var params = {};
    if($scope.account) {
      params.account = $scope.account.id;
    }
    // previous txns exist, get next page
    if($scope.txns.storage.length > 0) {
      var txn = $scope.txns.storage[$scope.txns.storage.length - 1];
      params.createdStart = txn.created;
      params.previous = txn.id;
    } else {
      params.createdStart = $scope.startDate;
    }
    if(params.createdStart instanceof Date) {
      params.createdStart = (+params.createdStart / 1000);
    }
    options.success = function(txns) {
      $scope.error = null;
      txns.storage.forEach(function(txn) {
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
    txn.getAll({params: params});
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

  function _updateTable() {
    $scope.table = [];
    angular.forEach($scope.txns.storage, function(txn) {
      // skip txns w/insufficent funds
      if(txn.voided &&
        txn.voidReason === 'payswarm.financial.InsufficientFunds') {
        return;
      }

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
          if(dst.owner === $scope.session.identity.id &&
            dst.paymentMethod === 'BankAccount') {
            transfer.destination +=
              ' (Bank Account: ' + dst.bankAccount + ')';
          }
        }
        transfer.hidden = true;
        $scope.table.push(transfer);
      });
    });
  }
}

});
