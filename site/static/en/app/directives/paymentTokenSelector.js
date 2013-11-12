/*!
 * PaymentToken Selector.
 *
 * @author Dave Longley
 */
define([], function() {

var deps = ['svcPaymentToken', 'svcModel'];
return {paymentTokenSelector: deps.concat(factory)};

function factory(svcPaymentToken, svcModel) {
  function Ctrl($scope) {
    $scope.model = {};
    $scope.services = {
      token: svcPaymentToken.state
    };
    $scope.paymentTokens = [];
    $scope.tokensFilteredByInstant = [];
    $scope.$watch('paymentTokens', function(tokens) {
      if(!$scope.selected || $.inArray($scope.selected, tokens) === -1) {
        $scope.selected = tokens[0] || null;
      }
    }, true);
    svcPaymentToken.get(function(err, tokens) {
      if(!err) {
        filterTokens($scope);
      }
    });
  }

  function filterTokens(scope) {
    // omit tokens if needed
    var filteredByInstant = scope.tokensFilteredByInstant;
    var omit = scope.omit || [];
    var tokens = [];
    for(var ti = 0; ti < filteredByInstant.length; ++ti) {
      var token = filteredByInstant[ti];
      var skip = false;
      for(var oi = 0; oi < omit.length && !skip; ++oi) {
        skip = (token.id === omit[oi]);
      }
      if(!skip) {
        tokens.push(token);
      }
    }
    svcModel.replaceArray(scope.paymentTokens, tokens);
  }

  function Link(scope, element, attrs) {
    attrs.$observe('fixed', function(value) {
      scope.fixed = value;
    });

    scope.$watch('instant', function(value) {
      if(value === 'non') {
        scope.tokensFilteredByInstant = svcPaymentToken.nonInstant;
        scope.paymentMethods = svcPaymentToken.nonInstantPaymentMethods;
      }
      else if(value) {
        scope.tokensFilteredByInstant = svcPaymentToken.instant;
        scope.paymentMethods = svcPaymentToken.instantPaymentMethods;
      }
      else {
        scope.tokensFilteredByInstant = svcPaymentToken.paymentTokens;
        scope.paymentMethods = svcPaymentToken.paymentMethods;
      }
      filterTokens(scope);
    });

    scope.$watch('omit', function(value) {
      filterTokens(scope);
    });
  }

  return {
    scope: {
      selected: '=',
      invalid: '=',
      fixed: '@',
      instant: '=',
      omit: '='
    },
    controller: ['$scope', Ctrl],
    templateUrl: '/partials/payment-token-selector.html',
    link: Link
  };
}

});
