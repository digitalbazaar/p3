/*!
 * PaymentToken Selector.
 *
 * @author Dave Longley
 */
define(['angular'], function(angular) {

'use strict';

/* @ngInject */
function factory(AlertService, ModelService, PaymentTokenService) {
  return {
    restrict: 'A',
    scope: {
      selected: '=psSelected',
      invalid: '=psInvalid',
      fixed: '@psFixed',
      instant: '=psInstant',
      omit: '=psOmit'
    },
    templateUrl:
      '/app/components/payment-token/payment-token-selector.html',
    link: Link
  };

  function Link(scope, element, attrs) {
    scope.model = {};
    scope.services = {
      token: PaymentTokenService.state
    };
    scope.grid = [];
    scope.paymentTokens = [];
    scope.tokensFilteredByInstant = [];

    scope.select = function(token) {
      scope.selected = token;
    };

    scope.$watch('paymentTokens', function(tokens) {
      // use first token if available and none yet selected
      if(!scope.selected) {
        scope.selected = tokens[0] || null;
      }
      // keep grid up-to-date
      buildGrid(2);
    }, true);

    attrs.$observe('psFixed', function(value) {
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
    scope.$watch('tokensFilteredByInstant', filterTokens, true);
    scope.$watch('paymentMethods', filterTokens, true);
    scope.$watch('omit', filterTokens);
    // FIXME: listen for changes to payment token service collection?

    PaymentTokenService.collection.getAll().then(filterTokens)
      .catch(function(err) {
        AlertService.add('error', err);
        scope.$apply();
      });

    function filterTokens() {
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

    function buildGrid(columns) {
      var row = null;
      scope.grid.length = 0;
      angular.forEach(scope.paymentTokens, function(token) {
        if(!row) {
          row = [];
        }
        row.push(token);
        if(row.length === columns) {
          scope.grid.push(row);
          row = null;
        }
      });
      if(row) {
        scope.grid.push(row);
      }
    }
  }
}

return {psPaymentTokenSelector: factory};

});
