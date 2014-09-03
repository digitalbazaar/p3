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
  $scope, brAlertService, brIdentityService, brRefreshService,
  psAccountService) {
  var self = this;

  self.modals = {};
  self.state = {
    accounts: psAccountService.state,
    identities: brIdentityService.state
  };
  self.account = undefined;

  brRefreshService.register($scope, function(force) {
    var opts = {force: !!force};
    brAlertService.clear();
    psAccountService.collection.getCurrent(opts)
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
