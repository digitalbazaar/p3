/*!
 * Edit PaymentToken Modal.
 *
 * @author Digital Bazaar
 */
define(['angular'], function(angular) {

'use strict';

/* @ngInject */
function factory(
  brAlertService, brIdentityService, config,
  psAccountService, psPaymentTokenService) {
  return {
    restrict: 'A',
    scope: {
      paymentMethods: '=psPaymentMethods',
      sourcePaymentToken: '=psPaymentToken'
    },
    require: '^stackable',
    name: 'editPaymentToken',
    templateUrl: requirejs.toUrl(
      'p3/components/payment-token/edit-payment-token-modal.html'),
    link: Link
  };

  function Link(scope, element, attrs, stackable) {
    scope.model = {};
    scope.monthLabels = config.constants.monthLabels;
    scope.years = config.constants.years;
    scope.identity = brIdentityService.identity;
    scope.loading = false;
    scope.editing = true;

    // copy for editing
    scope.paymentToken = angular.copy(scope.sourcePaymentToken);
    // aliases
    scope.card = scope.paymentToken;
    scope.bankAccount = scope.paymentToken;

    // setup environment based on token being edited
    scope.multiEnabled = false;

    if(scope.paymentToken.paymentMethod === 'CreditCard') {
      scope.creditCardEnabled = true;
      scope.paymentMethod = 'CreditCard';
    }
    if(scope.paymentToken.paymentMethod === 'BankAccount') {
      scope.bankAccountEnabled = true;
      scope.paymentMethod = 'BankAccount';
    }

    // must have been agreed to before
    scope.agreementChecked = true;
    scope.billingAddressRequired = true;
    // billing address UI depends on payment method
    scope.$watch('scope.paymentMethod', function() {
      var isCreditCard = (scope.paymentMethod === 'CreditCard');
      var isBankAccount = (scope.paymentMethod === 'BankAccount');
      scope.billingAddressRequired = isCreditCard || isBankAccount;
    });

    scope.editPaymentToken = function() {
      var paymentToken = {
        '@context': config.data.contextUrls.payswarm,
        id: scope.paymentToken.id,
        label: scope.paymentToken.label
      };

      // do general update then remove backup sources
      scope.loading = true;
      brAlertService.clearFeedback();
      psPaymentTokenService.collection.update(paymentToken)
        .then(function(paymentToken) {
          // remove backup source from every related account
          var promises = [];
          angular.forEach(scope.backupSourceFor, function(info) {
            if(!info.active) {
              promises.push(psAccountService.delBackupSource(
                info.account.id, scope.paymentToken.id).then(function() {
                  // mark as gone
                  scope.backupSourceFor[info.account.id].exists = false;
                }));
            }
          });
          return Promise.all(promises).then(function() {
            psPaymentTokenService.collection.get(paymentToken.id)
              .then(function() {
                stackable.close(null, paymentToken);
              });
          });
        })
        .catch(function(err) {
          // editor still open, update display
          brAlertService.add('error', err, {scope: scope});
          updateBackupSources();
        });
    };

    updateBackupSources();

    // load linked account info into editable map by id
    function updateBackupSources() {
      // FIXME: preserve old states
      var oldState = scope.backupSourceFor || {};
      scope.backupSourceFor = {};
      angular.forEach(scope.paymentToken.backupSourceFor, function(accountId) {
        // preserve any previous edit state on updates
        var active = true;
        var exists = true;
        if(accountId in oldState) {
          var info = oldState[accountId];
          active = info.active;
          exists = info.exists;
        }
        scope.backupSourceFor[accountId] = {
          account: {
            id: accountId,
            label: accountId
          },
          active: active,
          exists: exists,
          loading: true
        };
        psAccountService.collection.get(accountId).then(function(account) {
          scope.backupSourceFor[accountId].account = account;
        }).catch(function(err) {
          brAlertService.add('error', err, {scope: scope});
        }).then(function() {
          scope.backupSourceFor[accountId].loading = false;
          scope.$apply();
        });
      });
    }
  }
}

return {psEditPaymentTokenModal: factory};

});
