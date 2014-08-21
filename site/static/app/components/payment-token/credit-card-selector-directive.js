/*!
 * Credit Card Selector.
 *
 * @author Dave Longley
 */
define([], function() {

'use strict';

/* @ngInject */
function factory() {
  return {
    restrict: 'A',
    scope: {
      number: '=psCreditCardSelector',
      brand: '=psCreditCardBrand'
    },
    template: [
      '<span><span name="left"></span>',
      '<span name="center"></span>',
      '<span name="right"></span></span>'].join(''),
    replace: true,
    link: Link
  };

  function Link(scope, element, attrs) {
    scope.$watch('number', function(value) {
      var logo = 'all';
      scope.brand = null;

      if(/^4/.test(value)) {
        logo = 'visa';
        scope.brand = 'Visa';
      } else if(/^5[1-5]/.test(value)) {
        logo = 'mastercard';
        scope.brand = 'MasterCard';
      } else if(/^3[47]/.test(value)) {
        logo = 'amex';
        scope.brand = 'AmericanExpress';
      }
      // 6011, 622126-622925, 644-649, 65
      else if(/^(6((011)|(22((1((2[6-9])|([3-9]{1}[0-9])))|([2-8])|(9(([0-1]{1}[0-9])|(2[0-5])))))|(4[4-9])|5))/.test(value)) {
        logo = 'discover';
        scope.brand = 'Discover';
      } else if(/^62/.test(value)) {
        logo = 'china-up';
        scope.brand = 'ChinaUnionPay';
      }

      // remove old cc-logo classes
      element.children().removeClass(function(index, css) {
        return (css.match (/\bcc-logo-\S+/g) || []).join(' ');
      });

      // add new classes
      if(!scope.brand) {
        $('[name="left"]', element).addClass('cc-logo-all');
      } else {
        logo = 'cc-logo-' + logo;
        $('[name="left"]', element).addClass(logo + '-left');
        $('[name="center"]', element).addClass(logo + ' cc-logo-selected');
        $('[name="right"]', element).addClass(logo + '-right');
      }
    });
  }
}

return {psCreditCardSelector: factory};

});
