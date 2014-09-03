/*!
 * Withdraw Modal.
 *
 * @author Dave Longley
 */
define(['angular'], function(angular) {

'use strict';

/* @ngInject */
function factory(
  $filter, psAccountService, brAlertService, psTransactionService, config) {
  return {
    restrict: 'A',
    scope: {account: '=psAccount'},
    require: '^stackable',
    templateUrl: '/app/components/account/withdraw-modal.html',
    link: Link
  };

  function Link(scope, element, attrs) {
    // FIXME: be consistent with use of 'model'
    scope.model = {};
    scope.loading = false;
    scope.enableConfirm = false;
    // state in ('preparing', 'reviewing', 'complete')
    scope.state = null;

    var destination = scope.input ? scope.input.destination : null;
    scope.input = {
      // payment token destination
      destination: destination,
      mode: 'custom',
      amount: ''
    };
    scope.checkAmount = function() {
      var amountString = scope.input.amount;
      var amount = parseFloat(amountString);
      var balance = parseFloat(scope.account.balance);
      return (amountString === '' ||
        (!isNaN(amount) && (amount > 0) && (amount <= balance)));
    };

    scope.setAmount = function(amount, precision) {
      // FIXME: assume USD, get currency details from elsewhere
      if(precision === undefined) {
        precision = 2;
      }
      // must round up to smallest currency unit for deposits to account for
      // paying back the fractional part of used credit
      scope.input.amount = $filter('floor')(amount, precision);
    };

    scope.prepare = function() {
      scope.state = 'preparing';
      scope.enableConfirm = true;
      brAlertService.clearFeedback();
    };

    scope.prepare();

    scope.review = function() {
      // clean withdrawal
      var withdrawal = {
        '@context': config.data.contextUrl,
        type: ['Transaction', 'Withdrawal'],
        source: scope.account.id,
        payee: [{
          type: 'Payee',
          payeeGroup: ['withdrawal'],
          payeeRate: ''+scope.input.amount,
          payeeRateType: 'FlatAmount',
          payeeApplyType: 'ApplyExclusively',
          destination: scope.input.destination.id,
          currency: 'USD',
          comment: 'Withdrawal'
        }],
        destination: scope.input.destination.id
      };
      scope.loading = true;
      brAlertService.clearFeedback();
      psTransactionService.signWithdrawal(withdrawal).then(function(withdrawal) {
        // get public account information for all payees
        scope.accounts = {};
        var promises = [];
        angular.forEach(withdrawal.transfer, function(xfer) {
          var dst = xfer.destination;
          if(dst in scope.accounts || dst === scope.input.destination.id) {
            return;
          }
          var info = scope.accounts[dst] = {loading: true, label: ''};
          if(dst.indexOf('urn') === 0) {
            info.label = scope.input.destination.label;
            info.loading = false;
            return;
          }
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
          scope._withdrawal = angular.copy(withdrawal);
          scope.withdrawal = withdrawal;
          scope.state = 'reviewing';
        });
      }).catch(function(err) {
        brAlertService.add('error', err, {scope: scope});
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
      psTransactionService.confirmWithdrawal(scope._withdrawal)
        .then(function(withdrawal) {
          // show complete page
          scope.withdrawal = withdrawal;
          scope.state = 'complete';

          // get updated balance after a delay
          psAccountService.collection.get(scope.account.id, {delay: 500});

          // update recent transactions
          psTransactionService.getRecent({force: true});

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

return {psWithdrawModal: factory};

});
