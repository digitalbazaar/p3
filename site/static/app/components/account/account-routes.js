/*!
 * Account routes.
 *
 * Copyright (c) 2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Manu Sporny
 * @author David I. Lehn
 * @author Dave Longley
 */
define([], function() {

'use strict';

var base = window.data.identityBasePath;
return [{
  path: base + '/:identity/accounts',
  options: {
    title: 'Accounts',
    templateUrl: '/app/components/account/accounts.html'
  }
}, {
  path: base + '/:identity/accounts/:account',
  options: {
    title: 'Account',
    templateUrl: '/app/components/account/account.html'
  }
}];

});
