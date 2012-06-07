var config = require('../payswarm.config.js');

// customize mail template mapping
var templates = config.mail.templates;

templates.profileCreated = './profile.created';
templates.depositSuccess = './deposit.success';
templates.depositFailure = './deposit.failure';
