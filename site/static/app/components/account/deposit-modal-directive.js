/*!
 * Deposit Modal.
 *
 * @author Dave Longley
 */
define(['angular'], function(angular) {

'use strict'; 

/* @ngInject */
function factory(
  AccountService, AlertService, ModalService, TransactionService, config) {
  return ModalService.directive({
    name: 'deposit',
    scope: {
      account: '=',
      instant: '='
    },
    templateUrl: '/app/components/account/deposit-modal.html',
    link: Link
  });

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
      return AccountService.collection.get(scope.account.id).then(function() {
        scope.loading = false;
        scope.input.max = {
          currency: scope.account.currency,
          // FIXME: fix rounding
          amount: -parseFloat(scope.account.balance)
        };
      }).catch(function(err) {
        AlertService.add('error', err);
      });
    }

    scope.prepare = function() {
      scope.state = 'preparing';
      scope.enableConfirm = true;
      AlertService.clearModalFeedback(scope);
      reloadAccount().then(function() {
        scope.$apply();
      });
    };

    scope.prepare();

    scope.review = function() {
      // clean deposit
      var deposit = {
        '@context': config.data.contextUrl,
        type: ['Transaction', 'Deposit'],
        payee: [{
          type: 'Payee',
          payeeGroup: ['deposit'],
          payeeRate: ''+scope.input.amount,
          payeeRateType: 'FlatAmount',
          payeeApplyType: 'ApplyExclusively',
          destination: scope.account.id,
          currency: 'USD'
        }],
        source: scope.input.source.id
      };
      scope.loading = true;
      AlertService.clearModalFeedback(scope);
      TransactionService.signDeposit(deposit).then(function(deposit) {
        // get public account information for all payees
        scope.accounts = {};
        var promises = [];
        angular.forEach(deposit.transfer, function(xfer) {
          var dst = xfer.destination;
          if(dst in scope.accounts) {
            return;
          }
          var info = scope.accounts[dst] = {loading: true, label: ''};
          promises.push(AccountService.collection.get(dst).then(
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
        AlertService.add('error', err);
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
      AlertService.clearModalFeedback(scope);
      TransactionService.confirmDeposit(scope._deposit).then(function(deposit) {
        // show complete page
        scope.deposit = deposit;
        scope.state = 'complete';

        // get updated balance after a delay
        AccountService.collection.get(scope.account.id, {delay: 500});

        // update recent transactions
        TransactionService.getRecent({force: true});

        // go to top of page?
        //var target = options.target;
        //$(target).animate({scrollTop: 0}, 0);
      }).catch(function(err) {
        AlertService.add('error', err);
      }).then(function() {
        scope.loading = false;
        scope.$apply();
      });
    };
  }
}

return {depositModal: factory};

});
