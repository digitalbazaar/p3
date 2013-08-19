/*!
 * Controllers module.
 *
 * @author Dave Longley
 */
(function() {

define([
  'angular',
  'controllers/account',
  'controllers/activity',
  'controllers/addressSettings',
  'controllers/assetora',
  'controllers/budget',
  'controllers/contentPortal',
  'controllers/createProfile',
  'controllers/dashboard',
  'controllers/externalAccountSettings',
  'controllers/hostedAssets',
  'controllers/key',
  'controllers/keySettings',
  'controllers/login',
  'controllers/navbar',
  'controllers/passcode',
  'controllers/purchase',
  'controllers/register'
], function(angular) {
  // FIXME: simplify controller boilerplate to eliminate loop here
  // FIXME: use app.controllers?
  var module = angular.module('app.controllers', []);
  var controllers = Array.prototype.slice.call(arguments, 1);
  angular.forEach(controllers, function(controller) {
    module.controller(
      controller.name, controller.deps.concat(controller.factory));
  });
});

})();
