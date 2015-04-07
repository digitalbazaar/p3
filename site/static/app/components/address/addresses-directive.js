/*!
 * Addresses directive.
 *
 * Copyright (c) 2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author David I. Lehn
 * @author Dave Longley
 */
define([], function() {

'use strict';

/* @ngInject */
function factory() {
  return {
    restrict: 'E',
    replace: true,
    templateUrl: requirejs.toUrl('p3/components/address/addresses-view.html')
  };
}

return {psAddresses: factory};

});
