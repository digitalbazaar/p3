/*!
 * Edit PaymentToken Modal.
 *
 * @author Digital Bazaar
 */
define(['angular', 'payswarm.api'], function(angular, payswarm) {

var deps = ['svcModal'];
return {modalEditPaymentToken: deps.concat(factory)};

function factory(svcModal) {
  function Ctrl($scope, svcPaymentToken, svcConstant, svcAccount) {
    $scope.model = {};
    $scope.data = window.data || {};
    $scope.monthLabels = svcConstant.monthLabels;
    $scope.years = svcConstant.years;
    $scope.feedback = {contactSupport: true};
    $scope.loading = false;
    $scope.identity = $scope.data.identity || {};
    $scope.editing = true;

    // copy for editing
    $scope.paymentToken = angular.copy($scope.sourcePaymentToken);
    // aliases
    $scope.card = $scope.paymentToken;
    $scope.bankAccount = $scope.paymentToken;

    // setup environment based on token being edited
    $scope.multiEnabled = false;

    if($scope.paymentToken.paymentMethod === 'CreditCard') {
      $scope.creditCardEnabled = true;
      $scope.paymentMethod = 'CreditCard';
    }
    if($scope.paymentToken.paymentMethod === 'BankAccount') {
      $scope.bankAccountEnabled = true;
      $scope.paymentMethod = 'BankAccount';
    }

    // must have been agreed to before
    $scope.agreementChecked = true;
    $scope.billingAddressRequired = true;
    // billing address UI depends on payment method
    $scope.$watch('scope.paymentMethod', function() {
      var isCreditCard = ($scope.paymentMethod === 'CreditCard');
      var isBankAccount = ($scope.paymentMethod === 'BankAccount');
      $scope.billingAddressRequired = isCreditCard || isBankAccount;
    });

    // load linked account info into editable map by id
    function updateBackupSources() {
      // FIXME: preserve old states
      var oldState = $scope.backupSourceFor || {};
      $scope.backupSourceFor = {};
      angular.forEach($scope.paymentToken.backupSourceFor,
        function(accountId, key) {
        // preserve any previous edit state on updates
        var active = true;
        var exists = true;
        if(accountId in oldState) {
          var info = oldState[accountId];
          active = info.active;
          exists = info.exists;
        }
        $scope.backupSourceFor[accountId] = {
          account: {
            id: accountId,
            label: accountId
          },
          active: active,
          exists: exists,
          loading: true
        };
        svcAccount.getOne(accountId, function(err, account) {
          $scope.backupSourceFor[accountId].loading = false;
          if(!err) {
            $scope.backupSourceFor[accountId].account = account;
          }
        });
      });
    };
    updateBackupSources();

    function _removeAsBackupSource(accountIds, i, callback) {
      var id = $scope.paymentToken.id;
      if(i < accountIds.length) {
        svcAccount.delBackupSource(accountIds[i], id, function(err) {
          if(err) {
            return callback(err);
          }
          // mark as gone
          $scope.backupSourceFor[accountIds[i]].exists = false;
          // recurse
          _removeAsBackupSource(accountIds, i + 1, callback);
        });
      } else {
        callback();
      }
    }
    function removeAsBackupSource(callback) {
      // get account ids for removal
      var accountIds = [];
      angular.forEach($scope.backupSourceFor, function(info) {
        if(!info.active) {
          accountIds.push(info.account.id);
        }
      });
      // recursive removal
      _removeAsBackupSource(accountIds, 0, callback);
    }

    $scope.editPaymentToken = function() {
      var paymentToken = {
        '@context': payswarm.CONTEXT_URL,
        id: $scope.paymentToken.id,
        label: $scope.paymentToken.label
      };

      // do general update then remove backup sources
      $scope.loading = true;
      svcPaymentToken.update(paymentToken, function(err, paymentToken) {
        $scope.loading = false;
        $scope.feedback.error = err;
        if(!err) {
          $scope.loading = true;
          removeAsBackupSource(function(err) {
            $scope.feedback.error = err;
            // reload to update UI
            svcPaymentToken.getOne(paymentToken.id, function(tokenErr, token) {
              // ignore tokenErr, but update UI based on update err
              if(!err) {
                $scope.modal.close(null, paymentToken);
              } else {
                // editor still open, update display
                updateBackupSources();
              }
            });
          });
        }
      });
    };
  }

  return svcModal.directive({
    name: 'EditPaymentToken',
    scope: {
      paymentMethods: '=',
      sourcePaymentToken: '=paymentToken'
    },
    templateUrl: '/app/components/payment-token/edit-payment-token-modal.html',
    controller: [
      '$scope', 'svcPaymentToken', 'svcConstant', 'svcAccount', Ctrl
    ],
    link: function(scope, element, attrs) {
      scope.feedbackTarget = element;
    }
  });
}

});
