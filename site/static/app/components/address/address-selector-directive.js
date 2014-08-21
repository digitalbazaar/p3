/*!
 * Address Selector.
 *
 * @author Dave Longley
 */
define([], function() {

'use strict';

/* @ngInject */
function factory(AddressService, IdentityService) {
  return {
    restrict: 'A',
    scope: {
      selected: '=psSelected',
      invalid: '=psInvalid',
      fixed: '@psFixed'
    },
    templateUrl: '/app/components/address/address-selector.html',
    link: Link
  };

  function Link(scope, element, attrs) {
    // FIXME: use model consistently
    scope.model = {};
    scope.services = {
      address: AddressService.state
    };
    scope.identity = IdentityService.identity;
    scope.addresses = AddressService.addresses;

    attrs.$observe('psFixed', function(value) {
      scope.fixed = value;
    });

    scope.$watch('addresses', function(addresses) {
      if(!scope.selected || $.inArray(scope.selected, addresses) === -1) {
        scope.selected = addresses[0] || null;
      }
    }, true);

    AddressService.collection.getAll();
  }
}

return {psAddressSelector: factory};

});
