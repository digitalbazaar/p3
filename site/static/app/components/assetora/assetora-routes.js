/*!
 * Assetora routes.
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
  path: base + '/:identity/assetora',
  options: {
    templateUrl: requirejs.toUrl('p3/components/assetora.html')
  }
}, {
  path: base + '/:identity/causes',
  options: {
    templateUrl: requirejs.toUrl('p3/components/assetora/causes.html')
  }
}, {
  path: base + '/:identity/invoices',
  options: {
    templateUrl: requirejs.toUrl('p3/components/assetora/invoices.html')
  }
}, {
  path: base + '/:identity/tickets',
  options: {
    templateUrl: requirejs.toUrl('p3/component/assetora/tickets.html')
  }
}];

});
