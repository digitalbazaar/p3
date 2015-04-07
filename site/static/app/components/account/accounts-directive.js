/*!
 * Accounts directive.
 *
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 * @author David I. Lehn
 */
define([], function() {

'use strict';

/* @ngInject */
function factory(
  $rootScope, psAccountService, brAlertService, brIdentityService,
  psIdentityPreferencesService, psPaymentTokenService, config) {
  return {
    restrict: 'A',
    scope: {},
    templateUrl: requirejs.toUrl('p3/components/account/accounts-view.html'),
    link: Link
  };

  function Link(scope) {
    var model = scope.model = {};
    model.identity = brIdentityService.identity;
    model.accounts = psAccountService.accounts;
    model.tokens = psPaymentTokenService.paymentTokens;
    model.state = {
      accounts: psAccountService.state
    };
    model.modals = {
      showDeposit: false,
      showWithdraw: false,
      showEditAccount: false,
      showAddAccount: false,
      account: null
    };
    model.expandAccountBalance = {};

    model.setDefaultAccount = function(account) {
      var update = {
        '@context': config.data.contextUrls.payswarm,
        type: 'IdentityPreferences',
        source: account.id
      };

      brAlertService.clear();
      psIdentityPreferencesService.update(update)
        .catch(function(err) {
          brAlertService.add('error', err);
          console.error('setDefaultAccount error:', err);
        })
        .then(function() {
          $rootScope.$apply();
        });
    };

    // FIXME: token watch/update should be in the account service
    scope.$watch('model.tokens', function(value) {
      psAccountService.updateAccounts();
    }, true);

    psAccountService.collection.getAll();
    psPaymentTokenService.collection.getAll();
  }
}

return {psAccounts: factory};

});
