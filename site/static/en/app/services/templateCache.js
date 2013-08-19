/*!
 * PaySwarm Template Cache Service.
 *
 * @author Dave Longley
 */
(function() {

define(['angular'], function(angular) {

var name = 'svcTemplateCache';
var deps = ['$http', '$templateCache'];
var factory = function($http, $templateCache) {
  var service = {};
  service.get = function(url, callback) {
    $http.get(url, {cache: $templateCache})
      .success(function(data) {
        callback(null, data);
      })
      .error(function(data, status, headers) {
        callback('Failed to load template: ' + url);
      });
  };
  return service;
};

return {name: name, deps: deps, factory: factory};
});

})();
