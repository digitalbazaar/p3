/*!
 * Identity Preferences module.
 *
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 */
define([
  'angular',
  './identity-preferences-service'
], function(
  angular,
  identityPreferences
) {

'use strict';

var module = angular.module('app.identity-preferences', []);

module.service(identityPreferences);

return module.name;

});
