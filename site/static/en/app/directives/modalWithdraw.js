/*!
 * Withdraw Modal.
 *
 * @author Dave Longley
 */
define(['angular', 'async', 'payswarm.api'], function(
  angular, async, payswarm) {

var deps = ['svcModal'];
return {modalWithdraw: deps.concat(factory)};

function factory(svcModal) {
  function Ctrl($scope, svcPaymentToken, svcAccount, svcTransaction) {
    $scope.model = {};
    $scope.data = window.data || {};
    $scope.feedback = {};
    $scope.loading = false;

    var destination = $scope.input ? $scope.input.destination : null;
    $scope.input = {
      // payment token destination
      destination: destination,
      mode: 'custom',
      amount: ''
    };
    $scope.checkAmount = function() {
      var amountString = $scope.input.amount;
      var amount = parseFloat(amountString);
      var balance = parseFloat($scope.account.balance);
      return amountString === '' ||
        (!isNaN(amount) &&
          (amount > 0) &&
          (amount <= balance));
    };

    // state in ('preparing', 'reviewing', 'complete')
    $scope.state = 'preparing';

    $scope.prepare = function() {
      $scope.state = 'preparing';
      $scope.feedback = {};
    };

    $scope.review = function() {
      // clean withdrawal
      var withdrawal = {
        '@context': payswarm.CONTEXT_URL,
        type: ['Transaction', 'Withdrawal'],
        source: $scope.account.id,
        payee: [{
          type: 'Payee',
          payeeGroup: ['withdrawal'],
          payeeRate: $scope.input.amount,
          payeeRateType: 'FlatAmount',
          payeeApplyType: 'ApplyExclusively',
          destination: $scope.input.destination.id,
          currency: 'USD',
          comment: 'Withdrawal'
        }],
        destination: $scope.input.destination.id
      };
      $scope.loading = true;
      payswarm.withdrawal.sign({
        withdrawal: withdrawal,
        success: function(withdrawal) {
          // get public account information for all payees
          $scope.accounts = {};
          angular.forEach(withdrawal.transfer, function(xfer) {
            $scope.accounts[xfer.destination] = {};
          });
          async.forEach(Object.keys($scope.accounts),
            function(account, callback) {
            if(account.indexOf('urn') === 0) {
              $scope.accounts[account].label = $scope.input.destination.label;
              return callback();
            }
            payswarm.accounts.getOne({
              account: account,
              success: function(response) {
                $scope.accounts[account].label = response.label;
                callback();
              },
              error: function(err) {
                $scope.accounts[account].label = 'Private Account';
                callback();
              }
            });
          }, function(err) {
            // FIXME: handle err
            $scope.feedback = {};
            //
            // go to top of page
            // FIXME: use directive to do this
            //var target = options.target;
            //$(target).animate({scrollTop: 0}, 0);

            $scope.loading = false;

            // copy to avoid angular keys in POSTed data
            $scope._withdrawal = angular.copy(withdrawal);
            $scope.withdrawal = withdrawal;
            $scope.state = 'reviewing';
            $scope.$apply();
          });
        },
        error: function(err) {
          $scope.loading = false;
          $scope.feedback.error = err;
          $scope.$apply();
        }
      });
    };

    $scope.confirm = function() {
      $scope.loading = true;
      payswarm.withdrawal.confirm({
        withdrawal: $scope._withdrawal,
        success: function(withdrawal) {
          $scope.loading = false;
          $scope.feedback = {};

          // show complete page
          $scope.withdrawal = withdrawal;
          $scope.state = 'complete';
          $scope.$apply();

          // get updated balance after a delay
          svcAccount.getOne($scope.account.id, {delay: 500});

          // update recent transactions
          svcTransaction.getRecent({force: true});

          // go to top of page
          //var target = options.target;
          //$(target).animate({scrollTop: 0}, 0);
        },
        error: function(err) {
          $scope.loading = false;
          $scope.feedback.contactSupport = true;
          $scope.feedback.error = err;
          $scope.$apply();
        }
      });
    };

    //$scope.done = function() {
    //  $scope.modal.close(null, $scope.withdrawal);
    //}
  }

  return svcModal.directive({
    name: 'Withdraw',
    scope: {
      account: '='
    },
    templateUrl: '/app/templates/modals/withdraw.html',
    controller: [
      '$scope', 'svcPaymentToken', 'svcAccount', 'svcTransaction', Ctrl],
    link: function(scope, element, attrs) {
      scope.feedbackTarget = element;
    }
  });
}

});
