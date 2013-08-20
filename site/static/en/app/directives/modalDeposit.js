/*!
 * Deposit Modal.
 *
 * @author Dave Longley
 */
define(['angular', 'async', 'payswarm.api'], function(
  angular, async, payswarm) {

var deps = ['svcModal'];
return {modalDeposit: deps.concat(factory)};

function factory(svcModal) {
  function Ctrl($scope, svcPaymentToken, svcAccount, svcTransaction) {
    $scope.model = {};
    $scope.data = window.data || {};
    $scope.feedback = {};
    $scope.loading = false;

    var source = $scope.input ? $scope.input.source : null;
    $scope.input = {
      // payment token source
      source: source,
      amount: ''
    };

    // state in ('preparing', 'reviewing', 'complete')
    $scope.state = 'preparing';

    $scope.prepare = function() {
      $scope.state = 'preparing';
      $scope.feedback = {};
    };

    $scope.review = function() {
      // clean deposit
      var deposit = {
        '@context': payswarm.CONTEXT_URL,
        type: ['Transaction', 'Deposit'],
        payee: [{
          type: 'Payee',
          payeeGroup: ['deposit'],
          payeeRate: $scope.input.amount,
          payeeRateType: 'FlatAmount',
          payeeApplyType: 'ApplyExclusively',
          destination: $scope.account.id,
          currency: 'USD'
        }],
        source: $scope.input.source.id
      };
      $scope.loading = true;
      payswarm.deposit.sign({
        deposit: deposit,
        success: function(deposit) {
          // get public account information for all payees
          $scope.accounts = {};
          for(var i in deposit.transfer) {
            $scope.accounts[deposit.transfer[i].destination] = {};
          }
          async.forEach(Object.keys($scope.accounts),
            function(account, callback) {
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
            $scope._deposit = angular.copy(deposit);
            $scope.deposit = deposit;
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
      payswarm.deposit.confirm({
        deposit: $scope._deposit,
        success: function(deposit) {
          $scope.loading = false;
          $scope.feedback = {};

          // show complete page
          $scope.deposit = deposit;
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
    //  $scope.modal.close(null, $scope.deposit);
    //}
  }

  return svcModal.directive({
    name: 'Deposit',
    scope: {
      account: '=',
      instant: '='
    },
    templateUrl: '/partials/modals/deposit.html',
    controller: Ctrl,
    link: function(scope, element, attrs) {
      scope.feedbackTarget = element;
    }
  });
}

});
