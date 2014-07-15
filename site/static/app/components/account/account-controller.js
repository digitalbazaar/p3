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
  $scope, AccountService, AlertService, RefreshService, config) {
  var self = this;

  self.modals = {};
  self.state = {
    accounts: AccountService.state
  };
  self.account = null;

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
        $scope.$apply();
      });
  })();
>>>>>>> Account and Transaction updates.
}

return {AccountController: factory};

});
