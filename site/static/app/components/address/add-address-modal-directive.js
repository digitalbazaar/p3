/*!
 * Add Address Modal.
 *
 * @author Dave Longley
 */
define(['angular'], function(angular) {

'use strict';

/* @ngInject */
function factory(AddressService, AlertService, IdentityService, config) {
  return {
    restrict: 'A',
    scope: {},
    require: '^stackable',
    templateUrl: '/app/components/address/add-address-modal.html',
    link: Link
  };

  function Link(scope, element, attrs, stackable) {
    // FIXME: use 'model'
    var model = scope.model = {};
    scope.identity = IdentityService.identity;
    scope.originalAddress = {
      '@context': config.data.contextUrl,
      type: 'Address',
      // default to US
      addressCountry: 'US'
    };
    scope.selection = {
      address: null
    };
    scope.validatedAddress = null;

    scope.$watch(function() {
      return AddressService.state.loading;
    }, function(value) {
      scope.loading = !!value;
    });

    // state in ('editing', 'selecting')
    scope.state = 'editing';

    scope.validate = function() {
      AlertService.clearFeedback();
      AddressService.validate(scope.originalAddress).then(function(validated) {
        // FIXME: should backend handle this?
        // copy over non-validation fields
        scope.validatedAddress = angular.extend(validated, {
          '@context': config.data.contextUrl,
          type: 'Address',
          label: scope.originalAddress.label,
          name: scope.originalAddress.name
        });
        scope.state = 'selecting';
        if(scope.validatedAddress.sysValidated) {
          scope.selection.address = scope.validatedAddress;
        } else {
          scope.selection.address = scope.originalAddress;
        }
      }).catch(function(err) {
        AlertService.add('error', err, {scope: scope});
      }).then(function() {
        scope.$apply();
      });
    };

    scope.add = function(clickedAddress) {
      var addressToAdd = clickedAddress || scope.selection.address;
      AlertService.clearFeedback();
      AddressService.collection.add(addressToAdd).then(function(addedAddress) {
        stackable.close(null, addedAddress);
      }).catch(function(err) {
        AlertService.add('error', err, {scope: scope});
        scope.$apply();
      });
    };

    scope.edit = function() {
      AlertService.clearFeedback();
      scope.state = 'editing';
      scope.selection.address = null;
    };
  }
}

return {addAddressModal: factory};

});
