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
    templateUrl: '/app/components/payment-token/payment-token-selection.html'
  };
}

return {psPaymentTokenSelection: factory};

});
