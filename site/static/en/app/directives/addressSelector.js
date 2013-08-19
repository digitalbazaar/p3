/*!
 * Address Selector.
 *
 * @author Dave Longley
 */
(function() {

define([], function() {

var name = 'addressSelector';
var deps = [];
var factory = function() {
  function Ctrl($scope, svcIdentity, svcAddress) {
    $scope.model = {};
    $scope.services = {
      address: svcAddress.state
    };
    $scope.identity = svcIdentity.identity;
    $scope.addresses = svcAddress.addresses;
    $scope.$watch('addresses', function(addresses) {
      if(!$scope.selected || $.inArray($scope.selected, addresses) === -1) {
        $scope.selected = addresses[0] || null;
      }
    }, true);
    svcAddress.get();
  }

  function Link(scope, element, attrs) {
    attrs.$observe('fixed', function(value) {
      scope.fixed = value;
    });
  }

  return {
    scope: {
      selected: '=',
      invalid: '=',
      fixed: '@'
    },
    controller: Ctrl,
    templateUrl: '/partials/address-selector.html',
    link: Link
  };
};

return {name: name, deps: deps, factory: factory};
});

})();
