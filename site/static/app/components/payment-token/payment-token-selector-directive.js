/*!
 * PaymentToken Selector.
 *
 * @author Dave Longley
 */
define(['angular'], function(angular) {

var deps = ['ModelService', 'PaymentTokenService'];
return {paymentTokenSelector: deps.concat(factory)};

function factory(ModelService, PaymentTokenService) {
  function Ctrl($scope) {
    $scope.model = {};
    $scope.services = {
      token: PaymentTokenService.state
    };
    $scope.paymentTokens = [];
    $scope.tokensFilteredByInstant = [];
    $scope.$watch('paymentTokens', function(tokens) {
      // use first token if available and none yet selected
      if(!$scope.selected) {
        $scope.selected = tokens[0] || null;
      }
    }, true);
    PaymentTokenService.getAll(function(err, tokens) {
      if(!err) {
        filterTokens($scope);
      }
    });
  }

  function filterTokens(scope) {
    // omit tokens if needed
    var filteredByInstant = scope.tokensFilteredByInstant;
    var omit = scope.omit || [];
    if(!angular.isArray(omit)) {
      omit = [omit];
    }
    var tokens = [];
    for(var ti = 0; ti < filteredByInstant.length; ++ti) {
      var token = filteredByInstant[ti];
      var skip = false;
      for(var oi = 0; oi < omit.length && !skip; ++oi) {
        // get id if omit item is an object
        var omitId = omit[oi];
        if(angular.isObject(omitId)) {
          omitId = omitId.id;
        }
        skip = (token.id === omitId);
      }
      if(!skip) {
        tokens.push(token);
      }
    }
    ModelService.replaceArray(scope.paymentTokens, tokens);
  }

  function Link(scope, element, attrs) {
    attrs.$observe('fixed', function(value) {
      scope.fixed = value;
    });

    scope.$watch('instant', function(value) {
      if(value === 'non') {
        scope.tokensFilteredByInstant = PaymentTokenService.nonInstant;
        scope.paymentMethods = PaymentTokenService.nonInstantPaymentMethods;
      } else if(value) {
        scope.tokensFilteredByInstant = PaymentTokenService.instant;
        scope.paymentMethods = PaymentTokenService.instantPaymentMethods;
      } else {
        scope.tokensFilteredByInstant = PaymentTokenService.paymentTokens;
        scope.paymentMethods = PaymentTokenService.paymentMethods;
      }
    });

    // FIXME: suboptimal -- tokensFilteredByInstant and paymentMethods
    // generally change together so extra filtering will occur
    scope.$watch('tokensFilteredByInstant', function(value) {
      filterTokens(scope);
    }, true);

    scope.$watch('paymentMethods', function(value) {
      filterTokens(scope);
    }, true);

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
    templateUrl:
      '/app/components/payment-token/payment-token-selector-directive.html',
    link: Link
  };
}

});
