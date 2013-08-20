/*!
 * Services module.
 *
 * @author Dave Longley
 */
(function() {

define([
  'angular',
  'app/services/account',
  'app/services/address',
  'app/services/budget',
  'app/services/constant',
  'app/services/hostedAsset',
  'app/services/hostedListing',
  'app/services/identity',
  'app/services/key',
  'app/services/modal',
  'app/services/model',
  'app/services/paymentToken',
  'app/services/promo',
  'app/services/templateCache',
  'app/services/transaction'
], function(angular) {
  // FIXME: simplify service boilerplate to eliminate loop here
  var module = angular.module('app.services', []);
  var services = Array.prototype.slice.call(arguments, 1);
  angular.forEach(services, function(service) {
    module.factory(service.name, service.deps.concat(service.factory));
  });
});

})();
