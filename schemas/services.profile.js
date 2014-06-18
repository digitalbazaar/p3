var bedrock = require('bedrock');
var schemas = bedrock.validation.schemas;

var getPasscodeQuery = {
  type: 'object',
  properties: {
    passcode: {
      required: false,
      type: 'string',
      minLength: 1
    }
  },
  additionalProperties: true
};


var postPasscode = {
  title: 'Passcode',
  description: 'Create a passcode.',
  type: 'object',
  properties: {
    sysIdentifier: {
      required: true,
      type: [schemas.url(), schemas.slug(), schemas.email()]
    }
  },
  additionalProperties: false
};

var postPassword = {
  title: 'Password',
  description: 'Create a password.',
  type: 'object',
  properties: {
    id: schemas.url(),
    sysPassword: schemas.password(),
    sysPasswordNew: schemas.password()
  },
  additionalProperties: false
};

var postPasswordReset = {
  title: 'Reset password',
  description: 'Reset a password.',
  type: 'object',
  properties: {
    sysIdentifier: {
      required: true,
      type: [schemas.url(), schemas.slug(), schemas.email()]
    },
    sysPasscode: schemas.passcode(),
    sysPasswordNew: schemas.password()
  },
  additionalProperties: false
};

var postEmailVerify = {
  title: 'Verify email',
  description: 'Verify an email address.',
  type: 'object',
  properties: {
    sysIdentifier: {
      required: true,
      type: [schemas.url(), schemas.slug(), schemas.email()]
    },
    sysPasscode: schemas.passcode()
  },
  additionalProperties: false
};

var postCreate = {
  title: 'Create profile',
  description: 'Create a profile.',
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(),
    sysSlug: schemas.slug({required: false}),
    email: schemas.email(),
    sysPassword: schemas.password(),
    label: schemas.label({required: false}),
    sysIdentity: {
      required: true,
      type: 'object',
      properties: {
        type: {
          required: true,
          type: 'string',
          enum: ['PersonalIdentity', 'VendorIdentity']
        },
        sysSlug: schemas.slug(),
        label: schemas.label(),
        sysPublic: {
          required: false,
          type: schemas.propertyVisibility()
        }
      }
    },
    account: {
      required: true,
      type: 'object',
      properties: {
        sysSlug: schemas.slug(),
        label: schemas.label(),
        sysPublic: {
          required: false,
          type: schemas.propertyVisibility()
        }
      }
    }
  },
  additionalProperties: false
};

var getLoginQuery = {
  type: 'object',
  properties: {
    ref: {
      required: false,
      type: 'string'
    },
    expired: {
      required: false,
      type: 'string'
    }
  },
  additionalProperties: true
};

var postLogin = {
  title: 'Login',
  description: 'Login.',
  type: 'object',
  properties: {
    profile: {
      required: true,
      type: [schemas.slug(), schemas.email(), schemas.url()]
    },
    password: schemas.password(),
    ref: schemas.url({required: false})
  },
  additionalProperties: false
};

var postProfile = {
  title: 'Update profile',
  description: 'Update profile.',
  type: 'object',
  properties: {
    label: schemas.label({required: false}),
    email: schemas.email({required: false})
  },
  additionalProperties: false
};

var switchIdentity = {
  title: 'Switch identity',
  description: 'Switch identity.',
  type: 'object',
  properties: {
    identity: schemas.url(),
    redirect: schemas.url()
  },
  additionalProperties: false
};

module.exports.getPasscodeQuery = function() {
  return getPasscodeQuery;
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
module.exports.postEmailVerify = function() {
  return postEmailVerify;
};
module.exports.postCreate = function() {
  return postCreate;
};
module.exports.getLoginQuery = function() {
  return getLoginQuery;
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
