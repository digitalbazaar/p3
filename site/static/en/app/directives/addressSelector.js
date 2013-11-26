/*!
 * Address Selector.
 *
 * @author Dave Longley
 */
define([], function() {

var deps = [];
return {addressSelector: deps.concat(factory)};

function factory() {
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
    controller: ['$scope', 'svcIdentity', 'svcAddress', Ctrl],
    templateUrl: '/app/templates/address-selector.html',
    link: Link
  };
}

});
