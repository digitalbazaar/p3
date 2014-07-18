/*!
 * Account Controller.
 *
 * @author Manu Sporny
 * @author David I. Lehn
 * @author Dave Longley
 */
define([], function() {

'use strict';

/* @ngInject */
function factory(
  $scope, AccountService, AlertService, IdentityService, RefreshService, config) {
  var self = this;

  self.modals = {};
  self.state = {
    accounts: AccountService.state,
    identities: IdentityService.state
  };
  self.account = undefined;

  RefreshService.register($scope, function(force) {
    var opts = {force: !!force};
    AlertService.clear();
    AccountService.collection.getCurrent(opts)
      .then(function(account) {
        self.account = account;
        $scope.$apply();
      })
      .catch(function(err) {
        AlertService.add('error', err);
        self.account = null;
        $scope.$apply();
      });
  })();
}

return {AccountController: factory};

});
