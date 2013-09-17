/*!
 * Services module.
 *
 * @author Dave Longley
 */
define([
  'angular',
  'app/services/account',
  'app/services/address',
  'app/services/budget',
  'app/services/constant',
  //'app/services/hostedAsset',
  //'app/services/hostedListing',
  'app/services/identity',
  'app/services/key',
  'app/services/modal',
  'app/services/model',
  'app/services/paymentToken',
  'app/services/promo',
  'app/services/templateCache',
  'app/services/transaction'
], function(angular) {
  angular.module('app.services', []).factory(angular.extend.apply(
    null, [{}].concat(Array.prototype.slice.call(arguments, 1))));
});
