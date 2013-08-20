/*!
 * Filters module.
 *
 * @author Dave Longley
 */
(function() {

define([
  'angular',
  'app/filters/cardBrand',
  'app/filters/ccNumber',
  'app/filters/ceil',
  'app/filters/ellipsis',
  'app/filters/embeddedString',
  'app/filters/encodeURIComponent',
  'app/filters/floor',
  'app/filters/mask',
  'app/filters/now',
  'app/filters/prefill',
  'app/filters/slug'
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
