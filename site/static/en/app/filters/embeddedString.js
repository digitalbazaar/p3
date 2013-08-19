/*!
 * Embedded string filter.
 *
 * @author Dave Longley
 */
(function() {

define([], function() {

var name = 'embeddedString';
var deps = [];
var factory = function() {
  return function(value) {
    if(value === undefined || value === null) {
      return '';
    }
    return value.replace(/\r/g, '\\r').replace(/\n/g, '\\n');
  };
};

return {name: name, deps: deps, factory: factory};
});

})();
