/*!
 * Transaction routes.
 *
 * Copyright (c) 2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Manu Sporny
 * @author David I. Lehn
 * @author Dave Longley
 */
define([], function() {

'use strict';

return [{
  path: '/transactions/:transaction',
  options: {
    title: 'Transaction',
    templateUrl: '/app/components/transaction/transaction.html'
  }
}];

});
