/*!
 * Controllers module.
 *
 * @author Dave Longley
 */
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
  angular.module('app.controllers', []).controller(angular.extend.apply(
    null, [{}].concat(Array.prototype.slice.call(arguments, 1))));
});
