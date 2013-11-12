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
    $scope.tokenList = [];
    $scope.paymentTokens = svcPaymentToken.paymentTokens;
    $scope.$watch('paymentTokens', function(tokens) {
      loadList($scope);
    }, true);
    svcPaymentToken.get();

    $scope.addToken = function(err, token) {
      if(err) {
        // FIXME: display real errors (not 'cancelled', etc)
        return;
      }
      $scope.idList.push(token.id);
      loadList($scope);
    };
    $scope.moveIndexUp = function(index) {
      var list = $scope.idList;
      // swap index and index-1
      var old = list[index-1];
      list[index-1] = list[index];
      list[index] = old;
      loadList($scope);
    };
    $scope.moveIndexDown = function(index) {
      var list = $scope.idList;
      // swap index and index+1
      var old = list[index+1];
      list[index+1] = list[index];
      list[index] = old;
      loadList($scope);
    };
    $scope.deleteIndex = function(index) {
      $scope.idList.splice(index, 1);
      loadList($scope);
    };
  }

  function loadList($scope) {
    // load token objects from the ids
    var tokenList = [];
    angular.forEach($scope.idList, function(id) {
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
    scope.$watch('idList', function(value) {
      loadList(scope);
    });
  }

  return {
    scope: {
      // FIXME
      //feedback: '=',
      idList: '=',
      instant: '='
    },
    controller: ['$scope', 'svcAccount', Ctrl],
    templateUrl: '/partials/payment-token-list.html',
    link: Link
  };
}

});
