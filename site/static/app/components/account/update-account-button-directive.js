/*!
 * Update Account Button Directive.
 *
 * @author Dave Longley
 */
define([], function() {

'use strict';

/* @ngInject */
function factory(AccountService, brAlertService, brIdentityService, config) {
  return {
    restrict: 'A',
    scope: {account: '=psAccount', callback: '&psCallback'},
    templateUrl: '/app/components/account/update-account-button.html',
    link: Link
  };

  function Link(scope, element) {
    var model = scope.model = {};
    model.identity = brIdentityService.identity;

    model.updateAccount = function() {
      // merge in all properties from given account
      var account = {
        '@context': config.data.contextUrl,
        id: scope.account.id
      };
      scope.account.forEach(function(property) {
        account[property] = scope.account[property];
      });

      AccountService.update(account).then(function(account) {
        scope.callback(null, account);
      }).catch(function(err) {
        brAlertService.add('error', err);
        scope.callback(err, account);
      });
    };
  }
}

return {psUpdateAccountButton: factory};

});
