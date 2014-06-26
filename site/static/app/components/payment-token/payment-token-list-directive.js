/*!
 * PaymentToken List.
 *
 * @author Digital Bazaar
 */
define(['angular'], function(angular) {

var deps = ['AlertService', 'ModelService', 'PaymentTokenService'];
return {paymentTokenList: deps.concat(factory)};

function factory(AlertService, ModelService, PaymentTokenService) {
  return {
    scope: {
      idList: '=',
      instant: '='
    },
    templateUrl: '/app/components/payment-token/payment-token-list.html',
    link: Link
  };

  function Link(scope) {
    scope.model = {};
    scope.tokenList = [];
    scope.paymentTokens = PaymentTokenService.paymentTokens;

    scope.$watch('paymentTokens', loadList, true);
    scope.$watch('idList', loadList);

    scope.addToken = function(err, token) {
      if(err) {
        // display real errors (not 'canceled', etc)
        if(typeof err !== 'string') {
          AlertService.add('error', err);
        }
        return;
      }
      scope.idList.push(token.id);
      loadList(scope);
    };
    scope.moveIndexUp = function(index) {
      var list = scope.idList;
      // swap index and index-1
      list[index] = list.splice(index - 1, 1, list[index])[0];
      loadList(scope);
    };
    scope.moveIndexDown = function(index) {
      var list = scope.idList;
      // swap index and index+1
      list[index] = list.splice(index + 1, 1, list[index])[0];
      loadList(scope);
    };
    scope.deleteIndex = function(index) {
      scope.idList.splice(index, 1);
      loadList(scope);
    };

    PaymentTokenService.getAll();

    function loadList() {
      // load token objects from the ids
      var tokenList = [];
      angular.forEach(scope.idList, function(id) {
        var found = false;
        for(var i = 0; i < scope.paymentTokens.length; ++i) {
          var token = scope.paymentTokens[i];
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
      ModelService.replaceArray(scope.tokenList, tokenList);
    }
  }
}

});
