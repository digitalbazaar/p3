var url = require('./url');
var email = require('./email');
var slug = require('./slug');
var passcode = require('./passcode');
var password = require('./password');
var label = require('./label');
var payswarmId = require('./payswarmId');

var postPasscode = {
  type: 'object',
  properties: {
    psaIdentifier: {
      required: true,
      type: [slug(), email()]
    }
  }
};

var postPassword = {
  type: 'object',
  properties: {
    id: payswarmId(),
    psaPassword: password(),
    psaPasswordNew: password()
  }
};

var postPasswordReset = {
  type: 'object',
  properties: {
    psaIdentifier: {
      required: true,
      type: [slug(), email()]
    },
    psaPasscode: passcode(),
    psaPasswordNew: password()
  }
};

var postCreate = {
  type: 'object',
  properties: {
    psaSlug: slug({required: false}),
    email: email(),
    psaPassword: password(),
    label: label({required: false}),
    psaIdentity: {
      required: true,
      type: 'object',
      properties: {
        type: {
          required: true,
          type: 'string',
          enum: ['ps:PersonalIdentity', 'ps:VendorIdentity']
        },
        psaSlug: slug(),
        label: label()
      }
    },
    account: {
      required: true,
      type: 'object',
      properties: {
        psaSlug: slug(),
        label: label()
      }
    }
  }
};

var postLogin = {
  type: [{
    type: 'object',
    properties: {
      profile: {
        required: true,
        type: [slug(), email()]
      },
      password: password(),
      ref: url({required: false})
    }
  }, {
    type: 'object',
    properties: {
      profilename: slug(),
      password: password(),
      ref: url({required: false})
    }
  }]
};

var postProfile = {
  type: 'object',
  properties: {
    label: label({required: false}),
    email: email({required: false})
  }
};

var switchIdentity = {
  type: 'object',
  properties: {
    identity: payswarmId(),
    redirect: url()
  }
};

module.exports.postPasscode = function() {
  return postPasscode;
};
module.exports.postPassword = function() {
  return postPassword;
};
module.exports.postPasswordReset = function() {
  return postPasswordReset;
};
module.exports.postCreate = function() {
  return postCreate;
};
module.exports.postLogin = function() {
  return postLogin;
};
module.exports.postProfile = function() {
  return postProfile;
};
module.exports.switchIdentity = function() {
  return switchIdentity;
};
