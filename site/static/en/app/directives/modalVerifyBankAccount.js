/*!
 * Kredit font directive.
 *
 * @author Dave Longley
 */
define(['angular', 'async', 'payswarm.api'], function(
  angular, async, payswarm) {

var deps = ['svcModal'];
return {modalVerifyBankAccount: deps.concat(factory)};

function factory(svcModal) {
  function Ctrl($scope, svcPaymentToken, svcAccount) {
    $scope.selection = {
      destination: null
    };

    $scope.model = {};
    $scope.data = window.data || {};
    $scope.feedback = {};
    $scope.loading = false;
    $scope.depositTransfer = null;
    $scope.depositDestination = null;
    $scope.psaVerifyParameters = {
      amount: [
        null,
        null
      ]
    };
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
    };

    $scope.review = function() {
      var verifyRequest = {
        '@context': payswarm.CONTEXT_URL,
        psaVerifyParameters: {
          amount: [
            $scope.psaVerifyParameters.amount[0],
            $scope.psaVerifyParameters.amount[1]
          ]
        }
      };
      if($scope.selection.destination && $scope.input.amount &&
        parseFloat($scope.input.amount) !== 0) {
        verifyRequest.destination = $scope.selection.destination.id;
        verifyRequest.amount = $scope.input.amount;
      }
      $scope.loading = true;
      svcPaymentToken.verify(
        $scope.token.id, verifyRequest, function(err, deposit) {
        $scope.feedback.verifyError = false;
        if(!err) {
          // copy to avoid angular keys in POSTed data
          $scope._deposit = angular.copy(deposit);
          $scope.deposit = deposit;
        }
        // Synthesize validation error for UI
        // FIXME: improve error display
        else if(err.type === 'payswarm.website.VerifyPaymentTokenFailed' &&
          err.cause &&
          err.cause.type === 'payswarm.financial.VerificationFailed') {
          $scope.feedback.verifyError = true;
          err = {
            "message": "",
            "type": "payswarm.validation.ValidationError",
            "details": {
              "errors": [
                {
                  "name": "payswarm.validation.ValidationError",
                  "message": "verification amount is incorrect",
                  "details": {
                    "path": "psaVerifyParameters.amount[0]",
                    "public": true
                  },
                  "cause": null
                },
                {
                  "name": "payswarm.validation.ValidationError",
                  "message": "verification amount is incorrect",
                  "details": {
                    "path": "psaVerifyParameters.amount[1]",
                    "public": true
                  },
                  "cause": null
                }
              ]
            },
            "cause": null
          };
        }
        // Signal to contact support if needed.
        else if(err.type === 'payswarm.website.VerifyPaymentTokenFailed' &&
          err.cause &&
          err.cause.type === 'payswarm.financial.MaxVerifyAttemptsExceeded') {
          $scope.feedback.contactSupport = true;
        }
        $scope.feedback.error = err;
        if(err) {
          $scope.loading = false;
          return;
        }

        // FIXME: duplicated from deposit code
        // get public account information for all payees
        $scope.accounts = {};
        angular.forEach(deposit.transfer, function(xfer) {
          $scope.accounts[xfer.destination] = {};
          if($scope.selection.destination &&
            $scope.selection.destination.id === xfer.destination) {
            $scope.depositTransfer = xfer;
            $scope.depositDestination = $scope.selection.destination.id;
          }
        });
        async.forEach(
          Object.keys($scope.accounts),
          function(accountId, callback) {
            svcAccount.getOne(accountId, function(err, account) {
              $scope.accounts[accountId].label = (err ?
                'Private Account' : account.label);
              callback();
            });
        }, function(err) {
          $scope.loading = false;
          // FIXME: handle err
          $scope.feedback = {};
          //
          // go to top of page
          // FIXME: use directive to do this
          //var target = options.target;
          //$(target).animate({scrollTop: 0}, 0);

          $scope.state = 'reviewing';
          $scope.$apply();
        });
      });
    };

    $scope.confirm = function() {
      $scope.loading = true;
      svcPaymentToken.verify(
        $scope.token.id, $scope._deposit, function(err, deposit) {
        $scope.loading = false;
        if(!err) {
          // show complete page
          $scope.deposit = deposit;
          $scope.state = 'complete';
          $scope.$apply();

          // get updated token
          svcPaymentToken.getOne($scope.token.id);

          // get updated balance after a delay
          if($scope.selection.destination) {
            svcAccount.getOne($scope.selection.destination.id, {delay: 500});
          }

          // go to top of page
          //var target = options.target;
          //$(target).animate({scrollTop: 0}, 0);
        }
        $scope.feedback.error = err;
      });
    };

    //$scope.done = function() {
    //  $scope.modal.close(null, $scope.deposit);
    //}
  }

  return svcModal.directive({
    name: 'VerifyBankAccount',
    scope: {
      token: '='
    },
    templateUrl: '/partials/modals/verify-bank-account.html',
    controller: Ctrl,
    link: function(scope, element, attrs) {
      scope.feedbackTarget = element;
    }
  });
}

});
