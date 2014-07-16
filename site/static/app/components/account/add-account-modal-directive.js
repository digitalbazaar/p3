/*!
 * Add Account Modal.
 *
 * @author Dave Longley
 */
define([], function() {

'use strict';

/* @ngInject */
function factory(
  AccountService, AlertService, IdentityService, ModalService, config) {
  return ModalService.directive({
    name: 'addAccount',
    scope: {showAlert: '@addAccountAlertModal'},
    templateUrl: '/app/components/account/add-account-modal.html',
    link: Link
  });

  function Link(scope) {
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
      AlertService.clearModalFeedback(scope);
      account.sysPublic = [];
      if(model.accountVisibility === 'public') {
        account.sysPublic.push('label');
        account.sysPublic.push('owner');
      }

      AccountService.collection.add(account).then(function(account) {
        scope.modal.close(null, account);
      }).catch(function(err) {
        AlertService.add('error', err);
        scope.$apply();
      });
    };
  }
}

return {addAccountModal: factory};

});
