var fs = require('fs');
var config = require('../lib/payswarm.config.js');

// customize mail template mapping
var templates = config.mail.templates;

var ids = [
  'payswarm.common.Account.created',
  'payswarm.common.Deposit.charged',
  'payswarm.common.Deposit.charged-log',
  'payswarm.common.Deposit.failure',
  'payswarm.common.Deposit.success',
  'payswarm.common.Deposit.success-profile',
  'payswarm.common.Profile.created',
  'payswarm.common.Profile.created-profile',
  'payswarm.common.Profile.passcodeSent'
];

for(var idx in ids) {
  var id = ids[idx];
  templates[id] = fs.readFileSync(
    __dirname + '/' + id + '.tpl').toString('utf8');
}
