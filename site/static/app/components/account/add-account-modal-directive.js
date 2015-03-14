/*!
 * Add Account Modal.
 *
 * @author Dave Longley
 */
define([], function() {

'use strict';

/* @ngInject */
function factory(psAccountService, brAlertService, brIdentityService, config) {
  return {
    restrict: 'A',
    scope: {},
    require: '^stackable',
    templateUrl: '/app/components/account/add-account-modal.html',
    link: Link
  };

  function Link(scope, element, attrs, stackable) {
    var model = scope.model = {};
    model.identity = brIdentityService.identity;
    model.state = psAccountService.state;
    var account = model.account = {
      '@context': config.data.contextUrls.payswarm,
      currency: 'USD',
      sysPublic: []
    };
    model.accountVisibility = 'hidden';

    model.addAccount = function() {
      brAlertService.clearFeedback();
      account.sysPublic = [];
      if(model.accountVisibility === 'public') {
        account.sysPublic.push('label');
        account.sysPublic.push('owner');
      }

      psAccountService.collection.add(account).then(function(account) {
        stackable.close(null, account);
      }).catch(function(err) {
        brAlertService.add('error', err, {scope: scope});
        scope.$apply();
      });
    };
  }
}

return {psAddAccountModal: factory};

});
