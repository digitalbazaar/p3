/*!
 * Transaction Activity Support
 *
 * @requires jQuery v1.7+ (http://jquery.com/)
 *
 * @author Dave Longley
 */
// FIXME: use RequireJS AMD format
(function($) {

var module = angular.module('activity', ['ui']).
run(function() {
  // FIXME: run init code here
});

module.controller('ActivityCtrl', function($scope) {
  // initialize model
  var data = window.data || {};
  $scope.session = data.session || null;
  $scope.identity = data.identity || null;
  $scope.account = data.account || null;
  $scope.txns = [];
  $scope.first = 1;
  $scope.last = 0;
  $scope.total = 0;
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

  // create loading activity spinner
  var spinner = new Spinner({
    lines: 11, // The number of lines to draw
    length: 3, // The length of each line
    width: 3, // The line thickness
    radius: 5, // The radius of the inner circle
    rotate: 0, // The rotation offset
    color: '#000', // #rgb or #rrggbb
    speed: 1.0, // Rounds per second
    trail: 100, // Afterglow percentage
    shadow: false, // Whether to render a shadow
    hwaccel: false, // Whether to use hardware acceleration
    className: 'table-spinner inline-block', // CSS class for spinner
    top: 'auto', // Top position relative to parent in px
    left: 'auto' // Left position relative to parent in px
  });

  $scope.getMore = function() {
    // show loading indicator
    $scope.loading = true;
    spinner.spin();
    $('#spinner').append(spinner.el);

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
    // FIXME: remove limit, done for testing
    options.limit = 1;
    options.success = function(txns) {
      txns.forEach(function(txn) {
        _addTxn($scope, txn);
      });
      $scope.loading = false;
      spinner.stop();
      $scope.$apply();
    };
    options.error = function(err) {
      // FIXME: show error
      // $scope.error = err;
      console.log('ERROR', err);
      $scope.loading = false;
      spinner.stop();
      $scope.$apply();
    };

    // fetch txns
    payswarm.transactions.get(options);
  };

  // show/hide transaction details
  $scope.toggleDetails = function(txn) {
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
  $scope.last += 1;
  $scope.table.push(txn);
  txn.transfer.forEach(function(transfer) {
    transfer.hidden = true;
    $scope.table.push(transfer);
  });
}

})(jQuery);
