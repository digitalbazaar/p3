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
      complete: '@'
    },
    templateUrl: '/app/templates/transaction-details.html',
    controller: ['$scope', function($scope) {
      // public account info
      // map of id to {loading: <boolean>, label: <string>}
      $scope.accounts = {};

      $scope.$watch('transaction', function(value) {
        if(!value) {
          return;
        }
        // find and load unknown account info
        async.forEach(value.transfer, function(transfer, callback) {
          var destinationId = transfer.destination;
          if(destinationId in $scope.accounts) {
            return callback();
          }
          var info = $scope.accounts[destinationId] = {
            loading: true,
            label: ''
          };
          svcAccount.getOne(destinationId, function(err, account) {
            info.loading = false;
            info.label = err ? 'Private Account' : account.label;
            callback();
          });
        });
      });
    }]
  };
}

});
