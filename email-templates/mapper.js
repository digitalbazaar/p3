var fs = require('fs');
var config = require('../lib/payswarm.config.js');

// customize mail template mapping
var templates = config.mail.templates;

templates['payswarm.common.Profile.created'] = fs.readFileSync(
  __dirname + '/payswarm.common.Profile.created.tpl').toString('utf8');
