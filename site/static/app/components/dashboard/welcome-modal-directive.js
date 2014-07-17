/*!
 * New Identity Dashboard Welcome Modal.
 *
 * @author Dave Longley
 */
define([], function() {

'use strict';

/* @ngInject */
function factory(
  AccountService, AlertService, IdentityService, ModalService, config) {
  return ModalService.directive({
    name: 'welcome',
    templateUrl: '/app/components/dashboard/welcome-modal.html',
    link: Link
  });

  function Link(scope) {
    var model = scope.model = {};
    model.address = {};
    model.countries = config.constants.countries;
    model.data = config.data;
    model.identity = IdentityService.identity;
    model.state = AccountService.state;

    model.setRegulatoryLocality = function() {
      AlertService.clearModalFeedback(scope);

      var data = {
        address: {
          '@context': config.data.contextUrl,
          type: 'Address',
          addressRegion: model.address.addressRegion,
          addressCountry: model.address.addressCountry
        },
        // FIXME: allow user customization?
        account: {
          '@context': config.data.contextUrl,
          // FIXME: use default values from config
          label: 'Primary Account',
          sysSlug: 'primary',
          currency: 'USD',
          sysPublic: []
        }
      };
      AccountService.setRegulatoryAddress(data).then(function() {
        scope.$apply();
        scope.modal.close(null);
      }).catch(function(err) {
        AlertService.add('error', err);
        scope.$apply();
      });
    };
  }
}

return {welcomeModal: factory};

});
