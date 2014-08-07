/*!
 * Add Account Modal.
 *
 * @author Dave Longley
 */
define([], function() {

'use strict';

/* @ngInject */
function factory(AccountService, AlertService, IdentityService, config) {
  return {
    restrict: 'A',
    scope: {},
    require: '^stackable',
    templateUrl: '/app/components/account/add-account-modal.html',
    link: Link
  };

  function Link(scope, element, attrs, stackable) {
    var model = scope.model = {};
    model.identity = IdentityService.identity;
    model.state = AccountService.state;
    var account = model.account = {
      '@context': config.data.contextUrl,
      currency: 'USD',
      sysPublic: []
    };
    model.accountVisibility = 'hidden';

    model.addAccount = function() {
      AlertService.clearFeedback();
      account.sysPublic = [];
      if(model.accountVisibility === 'public') {
        account.sysPublic.push('label');
        account.sysPublic.push('owner');
      }

      AccountService.collection.add(account).then(function(account) {
        stackable.close(null, account);
      }).catch(function(err) {
        AlertService.add('error', err);
        scope.$apply();
      });
    };
  }
}

return {addAccountModal: factory};

});
