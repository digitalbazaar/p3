/*!
 * Identity Dashboard.
 *
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 * @author David I. Lehn
 */
define([], function() {

'use strict';

/* @ngInject */
function factory(IdentityService) {
  var self = this;
  self.identity = IdentityService.identity;
  // FIXME: set initial value according to whether or not a regulatory
  // locality has been set
  self.showWelcomeModal = false;
}

return {DashboardController: factory};

});
