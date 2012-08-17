var fs = require('fs');
var config = require('../lib/config');

module.exports.map = function(mapping) {
  var ids = [
    'common.Account.created',
    'common.Deposit.cc-merchant-account-log',
    'common.Deposit.ach-merchant-account-log',
    'common.Deposit.failure',
    'common.Deposit.success',
    'common.Deposit.success-profile',
    'common.Profile.created',
    'common.Profile.created-profile',
    'common.Profile.passcodeSent',
    'common.Purchase.success',
    'common.Purchase.success-profile'
  ];

  // FIXME: can't just map to filenames because swig can't use more than
  // one root directory, so the files must be loaded manually here
  ids.forEach(function(id) {
    var filename = __dirname + '/' + id + '.tpl';
    mapping[id] = {
      template: fs.readFileSync(filename).toString('utf8'),
      filename: filename
    };
  });
};
