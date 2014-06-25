/*!
 * Deposit Modal.
 *
 * @author Dave Longley
 */
define(['angular', 'async', 'payswarm.api'], function(
  angular, async, payswarm) {

var deps = [
  'AccountService', 'ModalService', 'PaymentTokenService',
  'TransactionService'];
return {depositModal: deps.concat(factory)};

function factory(
  AccountService, ModalService, PaymentTokenService,
  TransactionService, config) {
  function Ctrl($scope) {
    $scope.model = {};
    $scope.data = config.data || {};
    $scope.feedback = {};
    $scope.loading = false;
    $scope.enableConfirm = false;
    // state in ('preparing', 'reviewing', 'complete')
    $scope.state = null;

    var source = $scope.input ? $scope.input.source : null;
    $scope.input = {
      // payment token source
      source: source,
      mode: 'custom',
      amount: ''
    };

    function clearFeedback() {
      $scope.feedback.error = null;
      $scope.feedback.contactSupport = false;
    }

    function reloadAccount(callback) {
      callback = callback || angular.noop;
      // load latest account info if showing unpaid balance
      if(!$scope.account.sysAllowStoredValue) {
        $scope.loading = true;
        AccountService.getOne($scope.account.id, function(err) {
          $scope.loading = false;
          // FIXME: handle errors or just use old info?
          $scope.input.max = {
            currency: $scope.account.currency,
            // FIXME: fix rounding
            amount: -parseFloat($scope.account.balance)
          };
          callback();
        });
      } else {
        callback();
      }
    }

    $scope.prepare = function() {
      $scope.state = 'preparing';
      $scope.enableConfirm = true;
      clearFeedback();
      reloadAccount();
    };

    $scope.prepare();

    $scope.review = function() {
      // clean deposit
      var deposit = {
        '@context': payswarm.CONTEXT_URL,
        type: ['Transaction', 'Deposit'],
        payee: [{
          type: 'Payee',
          payeeGroup: ['deposit'],
          payeeRate: ''+$scope.input.amount,
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
          clearFeedback();

          // get public account information for all payees
          $scope.accounts = {};
          async.forEach(deposit.transfer, function(transfer, callback) {
            var destinationId = transfer.destination;
            if(destinationId in $scope.accounts) {
              return callback();
            }
            var info = $scope.accounts[destinationId] = {
              loading: true,
              label: ''
            };
            AccountService.getOne(destinationId, function(err, account) {
              info.loading = false;
              info.label = err ? 'Private Account' : account.label;
              callback();
            });
          }, function(err) {
            // FIXME: handle err
            clearFeedback();
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
          clearFeedback();
          reloadAccount();
          $scope.feedback.error = err;
          $scope.$apply();
        }
      });
    };

    $scope.confirm = function() {
      $scope.loading = true;
      // only allow a single confirm attempt
      $scope.enableConfirm = false;
      payswarm.deposit.confirm({
        deposit: $scope._deposit,
        success: function(deposit) {
          $scope.loading = false;
          clearFeedback();

          // show complete page
          $scope.deposit = deposit;
          $scope.state = 'complete';
          $scope.$apply();

          // get updated balance after a delay
          AccountService.getOne($scope.account.id, {delay: 500});

          // update recent transactions
          TransactionService.getRecent({force: true});

          // go to top of page
          //var target = options.target;
          //$(target).animate({scrollTop: 0}, 0);
        },
        error: function(err) {
          $scope.loading = false;
          clearFeedback();
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

  return ModalService.directive({
    name: 'deposit',
    scope: {
      account: '=',
      instant: '='
    },
    templateUrl: '/app/components/account/deposit-modal.html',
    controller: ['$scope', Ctrl],
    link: function(scope, element, attrs) {
      scope.feedbackTarget = element;
    }
  });
}

});
