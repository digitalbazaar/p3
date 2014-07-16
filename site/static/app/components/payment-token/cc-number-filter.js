/*!
 * Credit card number filter.
 *
 * @author Dave Longley
 */
define([], function() {

'use strict';

/* @ngInject */
function factory() {
  return function(value) {
    value = (value === undefined || value === null) ? '****' : value.toString();
    return '**** **** **** ' + value.substr(1);
  };
}

return {ccNumber: factory};

});
