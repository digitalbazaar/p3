/*!
 * Address Selector.
 *
 * @author Dave Longley
 */
define([], function() {

'use strict';

/* @ngInject */
function addressSelectorInner(psAddressService, brIdentityService) {
  return {
    restrict: 'A',
    require: 'brSelector',
    link: Link
  };

  function Link(scope, element, attrs, brSelector) {
    var model = scope.model = {};
    model.services = {
      address: psAddressService.state
    };
    model.identity = brIdentityService.identity;
    model.addresses = psAddressService.addresses;
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

    psAddressService.collection.getAll();
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
    templateUrl: requirejs.toUrl('p3/components/address/address-selector.html')
  };
}

return {
  psAddressSelector: addressSelector,
  psAddressSelectorInner: addressSelectorInner
};

});
