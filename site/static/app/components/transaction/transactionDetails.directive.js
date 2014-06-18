/*!
 * Transaction details directive.
 *
 * @author Digital Bazaar
 */
define(['async'], function(async) {

var deps = ['svcAccount'];
return {transactionDetails: deps.concat(factory)};

function factory(svcAccount) {
  return {
    scope: {
      transaction: '=transactionDetails',
      source: '=',
      destination: '=',
      complete: '@'
    },
    templateUrl: '/app/templates/transaction-details.html',
    controller: ['$scope', function($scope) {
      // public account info
      // map of id to {loading: <boolean>, label: <string>}
      $scope.accounts = {};
      // main transaction display type
      $scope.type = null;

      function getAccount(accountId, callback) {
        callback = callback || angular.noop;
        // done if already loaded or loading
        if(accountId in $scope.accounts) {
          return callback();
        }
        var info = $scope.accounts[accountId] = {
          loading: true,
          label: ''
        };
        svcAccount.getOne(accountId, function(err, account) {
          info.loading = false;
          info.label = err ? 'Private Account' : account.label;
          callback();
        });
      }

      // FIXME: use jsonld lib service
      function hasValue(obj, property, value) {
        if(property in obj) {
          if(angular.isArray(obj[property])) {
            return obj[property].indexOf(value) !== -1;
          }
          return angular.equals(obj[property], value);
        }
        return false;
      }

      $scope.$watch('transaction', function(value) {
        if(!value) {
          return;
        }
        if(hasValue(value, 'type', 'Deposit')) {
          $scope.type = 'Deposit';
        } else if(hasValue(value, 'type', 'Withdrawal')) {
          $scope.type = 'Withdrawal';
          // get source account info
          getAccount(value.transfer[0].source);
        } else {
          // FIXME: ?
          $scope.type = 'Transfer';
        }
        // find and load unknown account info
        // FIXME: improve source/dest/token/account handling
        async.forEach(value.transfer, function(transfer, callback) {
          // skip for withdrawals to a payment token
          if(!($scope.type == 'Withdrawal' &&
            value.destination &&
            (transfer.destination == value.destination.id))) {
            getAccount(transfer.destination);
          }
          callback();
        });
      });
    }]
  };
}

});
