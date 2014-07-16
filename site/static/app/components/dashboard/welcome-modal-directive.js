/*!
 * New Identity Dashboard Welcome Modal.
 *
 * @author Dave Longley
 */
define([], function() {

'use strict';

/* @ngInject */
function factory(
  AccountService, AddressService, AlertService, IdentityService,
  ModalService, config) {
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
    model.state = {};
    scope.$watch(function() {
      return AccountService.state.loading && AddressService.state.loading;
    }, function(value) {
      model.state.loading = model.state.loading && !!value;
    });

    model.setRegulatoryLocality = function() {
      AlertService.clearModalFeedback(scope);

      var data = {
        '@context': config.data.contextUrl,
        address: {
          addressRegion: model.address.addressRegion,
          addressCountry: model.address.addressCountry
        }
      };
      model.state.loading = true;
      AddressService.setRegulatoryAddress(data).then(function() {
        // FIXME: allow user customization?
        // FIXME: actually probably need to move this to a backend service
        // (and maybe to the account service entirely) as accounts will need
        // to be updated when this value changes anyway ... initial setting
        // would only be different in that a default account gets created as
        // a result
        var account = {
          '@context': config.data.contextUrl,
          // FIXME: use default values from config
          label: 'Primary Account',
          sysSlug: 'primary',
          currency: 'USD',
          sysPublic: []
        };
        return AccountService.collection.add(account);
      }).then(function(account) {
        model.state.loading = false;
        scope.$apply();
        scope.modal.close(null, account);
      }).catch(function(err) {
        model.state.loading = false;
        AlertService.add('error', err);
        scope.$apply();
      });
    };
  }
}

return {welcomeModal: factory};

});
