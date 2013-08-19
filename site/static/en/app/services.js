/*!
 * Services module.
 *
 * @author Dave Longley
 */
(function() {

define([
  'angular',
  'services/account',
  'services/address',
  'services/budget',
  'services/constant',
  'services/hostedAsset',
  'services/hostedListing',
  'services/identity',
  'services/key',
  'services/modal',
  'services/model',
  'services/paymentToken',
  'services/promo',
  'services/templateCache',
  'services/transaction'
], function(angular) {
  // FIXME: simplify service boilerplate to eliminate loop here
  var module = angular.module('app.services', []);
  var services = Array.prototype.slice.call(arguments, 1);
  angular.forEach(services, function(service) {
    module.factory(service.name, service.deps.concat(service.factory));
  });
});

})();
