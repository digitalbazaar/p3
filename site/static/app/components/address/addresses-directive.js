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

var deps = [];
return {appAddresses: deps.concat(factory)};

function factory() {
  return {
    restrict: 'E',
    replace: true,
    templateUrl: '/app/components/address/addresses-view.html'
  };
}

});
