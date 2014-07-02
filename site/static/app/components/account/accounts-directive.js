/*!
 * Accounts directive.
 *
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 * @author David I. Lehn
 */
define([], function() {

var deps = ['AccountService', 'IdentityService',
  'PaymentTokenService', 'config'];
return {accounts: deps.concat(factory)};

function factory(
  AccountService, IdentityService, PaymentTokenService, config) {
  return {
    scope: {},
    templateUrl: '/app/components/account/accounts-view.html',
    link: Link
  };

  function Link(scope) {
    var model = scope.model = {};
    model.identity = IdentityService.identity;
    model.accounts = AccountService.accounts;
    model.tokens = PaymentTokenService.paymentTokens;
    model.state = {
      accounts: AccountService.state
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
        '@context': config.data.contextUrl,
        type: 'IdentityPreferences',
        source: account.id
      };

      IdentityService.updatePreferences(
        model.identity.id, update,
        function(err) {
          // FIXME: show error feedback
          if(err) {
            console.error('setDefaultAccount error:', err);
          }
        });
    };

    // FIXME: token watch/update should be in the account service
    scope.$watch('model.tokens', function(value) {
      AccountService.updateAccounts();
    }, true);

    AccountService.collection.getAll();
    PaymentTokenService.collection.getAll();
  }
}

});
