/*!
 * Identity module.
 *
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 */
define([
  'angular',
  'bedrock/app/components/identity/createIdentity.controller',
  'bedrock/app/components/identity/identity.controller',
  'bedrock/app/components/identity/identity.routes',
  'bedrock/app/components/identity/identity.service',
  'bedrock/app/components/identity/identityCredentials.controller',
  'bedrock/app/components/identity/identitySelector.directive',
  'bedrock/app/components/identity/modalAddIdentity.directive',
  'bedrock/app/components/identity/credentialVerify.service'
  // FIXME: move to another module
  //'./identityPreferences.service.js'
], function(
  angular, createIdentity, controller, routes, service, identityCredentials,
  identitySelector, modalAddIdentity, credentialVerifyService) {

'use strict';

var module = angular.module('app.identity', []);

module.controller(createIdentity);
module.controller(controller);
module.controller(identityCredentials.controller);
module.service(service);
module.service(credentialVerifyService);
module.directive(identitySelector);
module.directive(modalAddIdentity);

module.config(['$routeProvider',
  function($routeProvider) {
    angular.forEach(routes, function(route) {
      $routeProvider.when(route.path, route.options);
    });
  }
]);

return module.name;

});
