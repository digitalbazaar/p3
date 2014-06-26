/*!
 * Add Address Modal.
 *
 * @author Dave Longley
 */
define(['angular'], function(angular) {

var deps = [
  'AddressService', 'AlertService', 'IdentityService', 'ModalService',
  'config'];
return {addAddressModal: deps.concat(factory)};

function factory(
  AddressService, AlertService, IdentityService, ModalService, config) {
  return ModalService.directive({
    name: 'addAddress',
    scope: {showAlert: '@addAddressAlertModal'},
    templateUrl: '/app/components/address/add-address-modal.html',
    link: Link
  });

  function Link(scope) {
    // FIXME: use 'model'
    var model = scope.model = {};
    scope.identity = IdentityService.identity;
    scope.countries = config.constants.countries || {};
    scope.originalAddress = {
      '@context': config.data.contextUrl,
      type: 'Address',
      // default to US
      countryName: 'US'
    };
    scope.selection = {
      address: null
    };
    scope.validatedAddress = null;

    scope.$watch('app.services.address.state', function(value) {
      scope.loading = !!value;
    });

    // state in ('editing', 'selecting')
    scope.state = 'editing';

    scope.validate = function() {
      AlertService.clearModalFeedback();
      AddressService.validate(scope.originalAddress).then(function(validated) {
        // FIXME: should backend handle this?
        // copy over non-validation fields
        scope.validatedAddress = angular.extend(validated, {
          '@context': config.data.contextUrl,
          type: 'Address',
          label: scope.originalAddress.label,
          fullName: scope.originalAddress.fullName
        });
        scope.state = 'selecting';
        if(scope.validatedAddress.sysValidated) {
          scope.selection.address = scope.validatedAddress;
        } else {
          scope.selection.address = scope.originalAddress;
        }
      }).catch(function(err) {
        AlertService.add('error', err);
        // FIXME: remove me
        console.log('validation failed', err);
      }).then(function() {
        scope.$apply();
      });
    };

    scope.add = function(clickedAddress) {
      var addressToAdd = clickedAddress || scope.selection.address;
      AlertService.clearModalFeedback();
      AddressService.add(addressToAdd).then(function(addedAddress) {
        scope.modal.close(null, addedAddress);
      }).catch(function(err) {
        AlertService.add('error', err);
        scope.$apply();
      });
    };

    scope.edit = function() {
      AlertService.clearModalFeedback();
      scope.state = 'editing';
      scope.selection.address = null;
    };
  }
}

});
