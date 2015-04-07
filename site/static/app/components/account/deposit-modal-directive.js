/*!
 * Deposit Modal.
 *
 * @author Dave Longley
 */
define(['angular'], function(angular) {

'use strict';

/* @ngInject */
function factory(
  $timeout, brAlertService, brRefreshService, config, psAccountService,
  psTransactionService) {
  return {
    restrict: 'A',
    scope: {
      account: '=psAccount',
      instant: '=psInstant'
    },
    require: '^stackable',
    templateUrl: requirejs.toUrl('p3/components/account/deposit-modal.html'),
    link: Link
  };

  function Link(scope) {
    // FIXME: be consistent with use of 'model'
    scope.model = {};
    scope.loading = false;
    scope.enableConfirm = false;
    // state in ('preparing', 'reviewing', 'complete')
    scope.state = null;

    var source = scope.input ? scope.input.source : null;
    scope.input = {
      // payment token source
      source: source,
      mode: 'custom',
      amount: ''
    };

    function reloadAccount() {
      if(scope.account.sysAllowStoredValue) {
        return Promise.resolve();
      }
      // showing unpaid balance, so load latest account info
      scope.loading = true;
      return psAccountService.collection.get(scope.account.id).then(function() {
        scope.loading = false;
        scope.input.max = {
          currency: scope.account.currency,
          // FIXME: fix rounding
          amount: -parseFloat(scope.account.balance)
        };
      }).catch(function(err) {
        brAlertService.add('error', err, {scope: scope});
      });
    }

    scope.prepare = function() {
      scope.state = 'preparing';
      scope.enableConfirm = true;
      brAlertService.clearFeedback();
      reloadAccount().then(function() {
        scope.$apply();
      });
    };

    scope.prepare();

    scope.review = function() {
      // clean deposit
      var deposit = {
        '@context': config.data.contextUrls.payswarm,
        type: ['Transaction', 'Deposit'],
        payee: [{
          type: 'Payee',
          payeeGroup: ['deposit'],
          payeeRate: '' + scope.input.amount,
          payeeRateType: 'FlatAmount',
          payeeApplyType: 'ApplyExclusively',
          destination: scope.account.id,
          currency: 'USD'
        }],
        source: scope.input.source.id
      };
      scope.loading = true;
      brAlertService.clearFeedback();
      psTransactionService.signDeposit(deposit).then(function(deposit) {
        // get public account information for all payees
        scope.accounts = {};
        var promises = [];
        angular.forEach(deposit.transfer, function(xfer) {
          var dst = xfer.destination;
          if(dst in scope.accounts) {
            return;
          }
          var info = scope.accounts[dst] = {loading: true, label: ''};
          promises.push(psAccountService.collection.get(dst).then(
            function(account) {
            info.label = account.label;
          }).catch(function() {
            info.label = 'Private Account';
          }).then(function() {
            info.loading = false;
            scope.$apply();
          }));
        });
        return Promise.all(promises).then(function() {
          //
          // go to top of page?
          // FIXME: use directive to do this
          //var target = options.target;
          //$(target).animate({scrollTop: 0}, 0);

          // copy to avoid angular keys in POSTed data
          scope._deposit = angular.copy(deposit);
          scope.deposit = deposit;
          scope.state = 'reviewing';
        });
      }).catch(function(err) {
        brAlertService.add('error', err, {scope: scope});
        reloadAccount();
      }).then(function() {
        scope.loading = false;
        scope.$apply();
      });
    };

    scope.confirm = function() {
      scope.loading = true;
      // only allow a single confirm attempt
      scope.enableConfirm = false;
      brAlertService.clearFeedback();
      psTransactionService.confirmDeposit(scope._deposit)
        .then(function(deposit) {
          // show complete page
          scope.deposit = deposit;
          scope.state = 'complete';

          /*
          // get updated balance after a delay
          psAccountService.collection.get(scope.account.id, {
            delay: 500,
            force: true
          });

          // update recent transactions
          // FIXME: this is not always the currently displayed txn collection
          //psTransactionService.getRecent({force: true});
          */

          // FIXME: a global refresh is used because the deposit modal may not
          // know or have access to the data that needs to be updated.  For
          // instance, on the account page the transactions displayed are from
          // a custom account collection.  Also see withdrawal directive.

          // refresh all data after a delay
          // FIXME: there may be a race condition here
          $timeout(function() {
            brRefreshService.refresh();
          }, 500);

          // go to top of page?
          //var target = options.target;
          //$(target).animate({scrollTop: 0}, 0);
        })
        .catch(function(err) {
          brAlertService.add('error', err, {scope: scope});
        })
        .then(function() {
          scope.loading = false;
          scope.$apply();
        });
    };
  }
}

return {psDepositModal: factory};

});
