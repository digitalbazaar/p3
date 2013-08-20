/*!
 * Controllers module.
 *
 * @author Dave Longley
 */
(function() {

define([
  'angular',
  'app/controllers/account',
  'app/controllers/activity',
  'app/controllers/addressSettings',
  'app/controllers/assetora',
  'app/controllers/budget',
  'app/controllers/contentPortal',
  'app/controllers/createProfile',
  'app/controllers/dashboard',
  'app/controllers/externalAccountSettings',
  'app/controllers/hostedAssets',
  'app/controllers/key',
  'app/controllers/keySettings',
  'app/controllers/login',
  'app/controllers/navbar',
  'app/controllers/passcode',
  'app/controllers/purchase',
  'app/controllers/register'
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
