module.exports.map = function(mapping) {
  var ids = [
    'common.FinancialAccount.created',
    'common.FinancialAccount.unbackedCreditPayoffFailed',
    'common.FinancialAccount.unbackedCreditPayoffFailed-identity',
    'common.Deposit.ach-merchant-account-log',
    'common.Deposit.cc-merchant-account-log',
    'common.Deposit.failure',
    'common.Deposit.success',
    'common.Deposit.success-identity',
    'common.PaymentToken.bankAccountCreated',
    'common.PaymentToken.bankAccountCreated-identity',
    'common.PaymentToken.unverified',
    'common.PaymentToken.unverified-identity',
    'common.PaymentToken.unverifiedLimitReached',
    'common.PaymentToken.verified-identity',
    'common.PaymentToken.verifyBalanceTooLow',
    'common.PaymentToken.verifyFailed',
    'common.Profile.created',
    'common.Profile.created-identity',
    'common.Profile.passcodeSent',
    'common.Purchase.success',
    'common.Purchase.success-identity',
    'common.Transaction.externalTransactionVoided',
    'common.Transaction.statusCheckError',
    'common.Transaction.statusChecksExceeded',
    'common.Withdrawal.ach-merchant-account-log',
    'common.Withdrawal.failure',
    'common.Withdrawal.success',
    'common.Withdrawal.success-identity',
    'hosted.Listing.assetExpired-identity'
  ];

  ids.forEach(function(id) {
    var filename = __dirname + '/' + id + '.tpl';
    mapping[id] = {filename: filename};
  });
};
