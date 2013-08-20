/*!
 * Main App module.
 *
 * @author Dave Longley
 */
define([
  'angular',
  'angular-ui',
  'bootstrap',
  'app/templates',
  'app/services',
  'app/directives',
  'app/filters',
  'app/controllers'
], function(angular) {
  var module = angular.module('app', [
    'app.directives', 'app.filters', 'app.services', 'app.controllers',
    'app.templates', 'ui']);
  module.run(['$rootScope', function($rootScope) {
    // utility functions
    var jsonld = $rootScope.jsonld = {};
    jsonld.isType = function(obj, value) {
      var types = obj.type;
      if(types) {
        if(!angular.isArray(types)) {
          types = [types];
        }
        return types.indexOf(value) !== -1;
      }
      return false;
    };
  }]);

  angular.bootstrap(document, ['app']);
});
