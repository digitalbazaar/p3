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

var base = window.data.idp.identityBasePath;
return [{
  path: base + '/:identity/accounts',
  options: {
    title: 'Accounts',
    session: 'required',
    templateUrl: requirejs.toUrl('p3/components/account/accounts.html')
  }
}, {
  path: base + '/:identity/accounts/:account',
  options: {
    title: 'Account',
    session: 'required',
    templateUrl: requirejs.toUrl('p3/components/account/account.html')
  }
}];

});
