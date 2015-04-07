/*!
 * PaymentToken Selection Display.
 *
 * @author Digital Bazaar
 */
define([], function() {

'use strict';

/* @ngInject */
function factory() {
  return {
    restrict: 'E',
    scope: {
      token: '=psToken',
      selecting: '=psSelecting',
      select: '&?psSelect'
    },
    templateUrl: requirejs.toUrl(
      'p3/components/payment-token/payment-token-selection.html')
  };
}

return {psPaymentTokenSelection: factory};

});
