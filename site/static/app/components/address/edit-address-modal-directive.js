/*!
 * Edit Address Modal.
 *
 * @author Dave Longley
 */
define(['angular'], function(angular) {

'use strict';

/* @ngInject */
function factory(AddressService, AlertService, config) {
  return {
    scope: {sourceAddress: '=psAddress'},
    require: '^stackable',
    templateUrl: '/app/components/address/edit-address-modal.html',
    link: Link
  };

  function Link(scope, element, attrs, stackable) {
    var model = scope.model = {};
    model.mode = 'edit';
    model.loading = false;
    // copy source for editing
    model.address = {};
    angular.extend(model.address, scope.sourceAddress);

    model.editAddress = function() {
      model.loading = true;
      // set all fields from UI
      var address = {
        '@context': config.data.contextUrl,
        id: model.address.id,
        label: model.address.label
      };

      model.loading = true;
      AlertService.clearFeedback();
      AddressService.collection.update(address).then(function(address) {
        model.loading = false;
        stackable.close(null, address);
        scope.$apply();
      }).catch(function(err) {
        model.loading = false;
        AlertService.add('error', err, {scope: scope});
        scope.$apply();
      });
    };
  }
}

return {psEditAddressModal: factory};

});
