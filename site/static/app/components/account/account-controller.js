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
  $scope, AccountService, brAlertService, brIdentityService, brRefreshService, config) {
  var self = this;

  self.modals = {};
  self.state = {
    accounts: AccountService.state,
    identities: brIdentityService.state
  };
  self.account = undefined;

  brRefreshService.register($scope, function(force) {
    var opts = {force: !!force};
    brAlertService.clear();
    AccountService.collection.getCurrent(opts)
      .then(function(account) {
        self.account = account;
        $scope.$apply();
      })
      .catch(function(err) {
        brAlertService.add('error', err);
        self.account = null;
        $scope.$apply();
      });
  })();
}

return {AccountController: factory};

});
