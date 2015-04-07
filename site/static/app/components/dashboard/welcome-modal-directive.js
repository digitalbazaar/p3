/*!
 * New Identity Dashboard Welcome Modal.
 *
 * @author Dave Longley
 */
define(['angular'], function(angular) {

'use strict';

/* @ngInject */
function factory(psAccountService, brAlertService, brIdentityService, config) {
  return {
    restrict: 'A',
    scope: {},
    require: '^stackable',
    templateUrl: requirejs.toUrl('p3/components/dashboard/welcome-modal.html'),
    link: Link
  };

  function Link(scope, element, attrs, stackable) {
    var model = scope.model = {};
    model.data = config.data;
    model.identity = brIdentityService.identity;
    model.state = psAccountService.state;
    model.address = angular.copy(model.identity.sysRegulatoryAddress || {});
    model.countries = config.constants.countries;

    model.setRegulatoryAddress = function() {
      brAlertService.clearFeedback();
      psAccountService.setRegulatoryAddress({
        address: {
          '@context': config.data.contextUrls.payswarm,
          type: 'Address',
          addressRegion: model.address.addressRegion,
          addressCountry: model.address.addressCountry
        },
        // FIXME: allow user customization?
        account: {
          '@context': config.data.contextUrls.payswarm,
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
        brAlertService.add('error', err, {scope: scope});
        scope.$apply();
      });
    };
  }
}

return {psWelcomeModal: factory};

});
