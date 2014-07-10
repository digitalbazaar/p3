/*!
 * External Accounts directive.
 *
 * Copyright (c) 2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author David I. Lehn
 * @author Dave Longley
 */
define([], function() {

'use strict';

var deps = [];
return {appExternalAccounts: deps.concat(factory)};

function factory() {
  return {
    restrict: 'E',
    replace: true,
    templateUrl: '/app/components/payment-token/external-accounts-view.html'
  };
}

});