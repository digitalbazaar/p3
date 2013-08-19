/*!
 * Filters module.
 *
 * @author Dave Longley
 */
(function() {

define([
  'angular',
  'filters/cardBrand',
  'filters/ccNumber',
  'filters/ceil',
  'filters/ellipsis',
  'filters/embeddedString',
  'filters/encodeURIComponent',
  'filters/floor',
  'filters/mask',
  'filters/now',
  'filters/prefill',
  'filters/slug'
], function(angular) {
  // FIXME: simplify filter boilerplate to eliminate loop here
  // FIXME: use app.filters?
  var module = angular.module('app.filters', []);
  var filters = Array.prototype.slice.call(arguments, 1);
  angular.forEach(filters, function(filter) {
    module.filter(filter.name, filter.deps.concat(filter.factory));
  });
});

})();
