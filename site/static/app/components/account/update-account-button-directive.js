/*!
 * Update Account Button Directive.
 *
 * @author Dave Longley
 */
define([], function() {

'use strict';

/* @ngInject */
function factory(psAccountService, brAlertService, brIdentityService, config) {
  return {
    restrict: 'A',
    scope: {account: '=psAccount', callback: '&psCallback'},
    templateUrl: requirejs.toUrl(
      'p3/components/account/update-account-button.html'),
    link: Link
  };

  function Link(scope, element) {
    var model = scope.model = {};
    model.identity = brIdentityService.identity;

    model.updateAccount = function() {
      // merge in all properties from given account
      var account = {
        '@context': config.data.contextUrls.payswarm,
        id: scope.account.id
      };
      scope.account.forEach(function(property) {
        account[property] = scope.account[property];
      });

      psAccountService.update(account).then(function(account) {
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
