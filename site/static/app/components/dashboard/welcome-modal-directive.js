/*!
 * New Identity Dashboard Welcome Modal.
 *
 * @author Dave Longley
 */
define(['angular'], function(angular) {

'use strict';

/* @ngInject */
function factory(AccountService, AlertService, IdentityService, config) {
  return {
    restrict: 'A',
    scope: {},
    require: '^stackable',
    templateUrl: '/app/components/dashboard/welcome-modal.html',
    link: Link
  };

  function Link(scope, element, attrs, stackable) {
    var model = scope.model = {};
    model.data = config.data;
    model.identity = IdentityService.identity;
    model.state = AccountService.state;
    model.address = angular.copy(model.identity.sysRegulatoryAddress || {});
    model.countries = config.constants.countries;

    model.setRegulatoryAddress = function() {
      AlertService.clearFeedback();
      AccountService.setRegulatoryAddress({
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
      }).then(function() {
        scope.$apply();
        stackable.close(null);
      }).catch(function(err) {
        AlertService.add('error', err);
        scope.$apply();
      });
    };
  }
}

return {psWelcomeModal: factory};

});
