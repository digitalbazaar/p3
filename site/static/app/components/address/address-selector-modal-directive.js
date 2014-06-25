/*!
 * Address Selector.
 *
 * @author Dave Longley
 */
define([], function() {

var deps = [];
return {addressSelector: deps.concat(factory)};

function factory() {
  function Ctrl($scope, svcIdentity, AddressService) {
    $scope.model = {};
    $scope.services = {
      address: AddressService.state
    };
    $scope.identity = svcIdentity.identity;
    $scope.addresses = AddressService.addresses;
    $scope.$watch('addresses', function(addresses) {
      if(!$scope.selected || $.inArray($scope.selected, addresses) === -1) {
        $scope.selected = addresses[0] || null;
      }
    }, true);
    AddressService.get();
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
    controller: ['$scope', 'svcIdentity', 'AddressService', Ctrl],
    templateUrl: '/app/components/address/address-selector-modal.html',
    link: Link
  };
}

});
