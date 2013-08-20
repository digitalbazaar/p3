/*!
 * PaymentToken Selector.
 *
 * @author Dave Longley
 */
define([], function() {

var deps = ['svcPaymentToken'];
return {paymentTokenSelector: deps.concat(factory)};

function factory(svcPaymentToken) {
  function Ctrl($scope) {
    $scope.model = {};
    $scope.services = {
      token: svcPaymentToken.state
    };
    $scope.paymentTokens = svcPaymentToken.paymentTokens;
    $scope.$watch('paymentTokens', function(tokens) {
      if(!$scope.selected || $.inArray($scope.selected, tokens) === -1) {
        $scope.selected = tokens[0] || null;
      }
    }, true);
    svcPaymentToken.get();
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
  }

  return {
    scope: {
      selected: '=',
      invalid: '=',
      fixed: '@',
      instant: '='
    },
    controller: Ctrl,
    templateUrl: '/partials/payment-token-selector.html',
    link: Link
  };
}

});
