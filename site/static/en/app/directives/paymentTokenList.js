/*!
 * PaymentToken List.
 *
 * @author Digital Bazaar
 */
define([], function() {

var deps = ['svcModel', 'svcPaymentToken'];
return {paymentTokenList: deps.concat(factory)};

function factory(svcModel, svcPaymentToken) {
  function Ctrl($scope, svcAccount) {
    $scope.model = {};
    $scope.feedback = {};
    $scope.services = {
      token: svcPaymentToken.state
    };
    $scope.tokenList = [];
    $scope.paymentTokens = svcPaymentToken.paymentTokens;
    $scope.$watch('paymentTokens', function(tokens) {
      loadList($scope);
    }, true);
    svcPaymentToken.get();
    $scope.moveBackupSourceUp = function(index) {
      var list = $scope.account.backupSource;
      // swap index and index-1
      var old = list[index-1];
      list[index-1] = list[index];
      list[index] = old;
      loadList($scope);
    };
    $scope.moveBackupSourceDown = function(index) {
      var list = $scope.account.backupSource;
      // swap index and index+1
      var old = list[index+1];
      list[index+1] = list[index];
      list[index] = old;
      loadList($scope);
    };
    $scope.deleteBackupSource = function(token) {
      $scope.model.loading = true;
      svcAccount.delBackupSource($scope.account.id, token.id, function(err) {
        $scope.model.loading = true;
        $scope.feedback.error = err;
      });
    };
  }

  function loadList($scope) {
    // load token objects from the ids
    var tokenList = [];
    angular.forEach($scope.account.backupSource, function(id) {
      var found = false;
      for(var i = 0; i < $scope.paymentTokens.length; ++i) {
        var token = $scope.paymentTokens[i];
        if(id === token.id) {
          tokenList.push(token);
          found = true;
          break;
        }
      }
      // fallback (shouldn't happen)
      if(!found) {
        tokenList.push({
          id: id,
          label: '?'
        });
      }
    });
    svcModel.replaceArray($scope.tokenList, tokenList);
  }

  function Link(scope, element, attrs) {
    attrs.$observe('fixed', function(value) {
      scope.fixed = value;
    });
    scope.$watch('instant', function(value) {
      if(value === 'non') {
        scope.paymentTokens = svcPaymentToken.nonInstant;
        scope.paymentMethods = svcPaymentToken.nonInstantPaymentMethods;
      }
      else if(value) {
        scope.paymentTokens = svcPaymentToken.instant;
        scope.paymentMethods = svcPaymentToken.instantPaymentMethods;
      }
      else {
        scope.paymentTokens = svcPaymentToken.paymentTokens;
        scope.paymentMethods = svcPaymentToken.paymentMethods;
      }
    });
    scope.$watch('account.backupSource', function(value) {
      loadList(scope);
    });
  }

  return {
    scope: {
      account: '=',
      invalid: '=',
      fixed: '@',
      instant: '='
    },
    controller: ['$scope', 'svcAccount', Ctrl],
    templateUrl: '/partials/payment-token-list.html',
    link: Link
  };
}

});
