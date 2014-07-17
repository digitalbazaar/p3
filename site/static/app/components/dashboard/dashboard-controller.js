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
  // show welcome modal based on whether a regulatory address has been set
  self.showWelcomeModal = !self.identity.sysRegulatoryAddress;
}

return {DashboardController: factory};

});
