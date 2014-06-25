/*!
 * Withdraw Modal.
 *
 * @author Dave Longley
 */
define(['angular', 'async', 'payswarm.api'], function(
  angular, async, payswarm) {

var deps = [
  '$filter', 'AccountService', 'ModalService', 'PaymentTokenService',
  'TransactionService', 'config'];
return {withdrawModal: deps.concat(factory)};

function factory(
  $filter, AccountService, ModalService, PaymentTokenService,
  TransactionService, config) {
  function Ctrl($scope) {
    $scope.model = {};
    $scope.data = config.data || {};
    $scope.feedback = {};
    $scope.loading = false;
    $scope.enableConfirm = false;
    // state in ('preparing', 'reviewing', 'complete')
    $scope.state = null;

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

    function clearFeedback() {
      $scope.feedback.error = null;
      $scope.feedback.contactSupport = false;
    }

    $scope.setAmount = function(amount, precision) {
      // FIXME: assume USD, get currency details from elsewhere
      if(precision === undefined) {
        precision = 2;
      }
      // must round up to smallest currency unit for deposits to account for
      // paying back the fractional part of used credit
      $scope.input.amount = $filter('floor')(amount, precision);
    };

    $scope.prepare = function() {
      $scope.state = 'preparing';
      $scope.enableConfirm = true;
      clearFeedback();
    };

    $scope.prepare();

    $scope.review = function() {
      // clean withdrawal
      var withdrawal = {
        '@context': payswarm.CONTEXT_URL,
        type: ['Transaction', 'Withdrawal'],
        source: $scope.account.id,
        payee: [{
          type: 'Payee',
          payeeGroup: ['withdrawal'],
          payeeRate: ''+$scope.input.amount,
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
          clearFeedback();
          // get public account information for all payees
          $scope.accounts = {};
          async.forEach(withdrawal.transfer, function(transfer, callback) {
            var destinationId = transfer.destination;
            if(destinationId in $scope.accounts ||
              destinationId === $scope.input.destination.id) {
              return callback();
            }
            var info = $scope.accounts[destinationId] = {
              loading: true,
              label: ''
            };
            if(destinationId.indexOf('urn') === 0) {
              info.label = $scope.input.destination.label;
              info.loading = false;
              return callback();
            }
            AccountService.get(destinationId, function(err, account) {
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
            $scope._withdrawal = angular.copy(withdrawal);
            $scope.withdrawal = withdrawal;
            $scope.state = 'reviewing';
            $scope.$apply();
          });
        },
        error: function(err) {
          $scope.loading = false;
          clearFeedback();
          $scope.feedback.error = err;
          $scope.$apply();
        }
      });
    };

    $scope.confirm = function() {
      $scope.loading = true;
      // only allow a single confirm attempt
      $scope.enableConfirm = false;
      payswarm.withdrawal.confirm({
        withdrawal: $scope._withdrawal,
        success: function(withdrawal) {
          $scope.loading = false;
          clearFeedback();

          // show complete page
          $scope.withdrawal = withdrawal;
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
    //  $scope.modal.close(null, $scope.withdrawal);
    //}
  }

  return ModalService.directive({
    name: 'withdraw',
    scope: {
      account: '='
    },
    templateUrl: '/app/components/account/withdraw-modal.html',
    controller: ['$scope', Ctrl],
    link: function(scope, element, attrs) {
      scope.feedbackTarget = element;
    }
  });
}

});
