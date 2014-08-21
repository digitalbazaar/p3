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
    var model = scope.model = {};
    model.services = {
      address: AddressService.state
    };
    model.identity = IdentityService.identity;
    model.addresses = AddressService.addresses;

    attrs.$observe('psFixed', function(value) {
      scope.fixed = value;
    });

    scope.$watch('model.addresses', function(addresses) {
      if(!scope.selected || $.inArray(scope.selected, addresses) === -1) {
        scope.selected = addresses[0] || null;
      }
    }, true);

    AddressService.collection.getAll();
  }
}

return {psAddressSelector: factory};

});
