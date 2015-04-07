/*!
 * Budget routes.
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
  path: base + '/:identity/budgets/:budget',
  options: {
    title: 'Budget',
    session: 'required',
    templateUrl: requirejs.toUrl('p3/components/budget/budget.html')
  }
}];

});
