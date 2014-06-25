/*!
 * Update Account Button Directive.
 *
 * @author Dave Longley
 */
define([], function() {

var deps = ['AccountService', 'AlertService', 'IdentityService', 'config'];
return {updateAccountButton: deps.concat(factory)};

function factory(AccountService, AlertService, IdentityService, config) {
  return {
    scope: {account: '=', callback: '&'},
    templateUrl: '/app/components/account/update-account-button.html',
    link: Link
  };

  function Link(scope, element) {
    var model = scope.model = {};
    model.identity = IdentityService.identity;

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
        AlertService.add('error', err);
        scope.callback(err, account);
      });
    };
  }
}

});
