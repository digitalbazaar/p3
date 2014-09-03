/*!
 * Address Selector.
 *
 * @author Dave Longley
 */
define([], function() {

'use strict';

/* @ngInject */
function addressSelectorInner(AddressService, brIdentityService) {
  return {
    restrict: 'A',
    require: 'brSelector',
    link: Link
  };

  function Link(scope, element, attrs, brSelector) {
    var model = scope.model = {};
    model.services = {
      address: AddressService.state
    };
    model.identity = brIdentityService.identity;
    model.addresses = AddressService.addresses;
    scope.$watch('model.addresses', function(addresses) {
      if(!scope.selected || $.inArray(scope.selected, addresses) === -1) {
        scope.selected = addresses[0] || null;
      }
    }, true);

    // configure brSelector
    scope.brSelector = brSelector;
    brSelector.itemType = 'Address';
    brSelector.items = model.addresses;
    brSelector.addItem = function() {
      model.showAddAddressModal = true;
    };
    scope.$watch('fixed', function(value) {
      brSelector.fixed = value;
    });

    AddressService.collection.getAll();
  }
}

/* @ngInject */
function addressSelector() {
  return {
    restrict: 'EA',
    scope: {
      selected: '=psSelected',
      invalid: '=psInvalid',
      fixed: '=?psFixed'
    },
    templateUrl: '/app/components/address/address-selector.html'
  };
}

return {
  psAddressSelector: addressSelector,
  psAddressSelectorInner: addressSelectorInner
};

});
