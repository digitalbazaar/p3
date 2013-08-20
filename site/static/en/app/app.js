/*!
 * Main App module.
 *
 * @author Dave Longley
 */
(function() {

define([
  'angular',
  'angular-ui',
  'bootstrap',
  'jquery-ui',
  'jquery.placeholder',
  'app/services',
  'app/directives',
  'app/filters',
  'app/controllers'
], function(angular) {
  var module = angular.module('app', [
    'app.directives', 'app.filters', 'app.services', 'app.controllers', 'ui']);
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

})();
