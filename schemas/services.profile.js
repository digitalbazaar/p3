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
    psaIdentifier: {
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
    psaPassword: schemas.password(),
    psaPasswordNew: schemas.password()
  },
  additionalProperties: false
};

var postPasswordReset = {
  title: 'Reset password',
  description: 'Reset a password.',
  type: 'object',
  properties: {
    psaIdentifier: {
      required: true,
      type: [schemas.url(), schemas.slug(), schemas.email()]
    },
    psaPasscode: schemas.passcode(),
    psaPasswordNew: schemas.password()
  },
  additionalProperties: false
};

var postEmailVerify = {
  title: 'Verify email',
  description: 'Verify an email address.',
  type: 'object',
  properties: {
    psaIdentifier: {
      required: true,
      type: [schemas.url(), schemas.slug(), schemas.email()]
    },
    psaPasscode: schemas.passcode()
  },
  additionalProperties: false
};

var postCreate = {
  title: 'Create profile',
  description: 'Create a profile.',
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(),
    psaSlug: schemas.slug({required: false}),
    email: schemas.email(),
    psaPassword: schemas.password(),
    label: schemas.label({required: false}),
    psaIdentity: {
      required: true,
      type: 'object',
      properties: {
        type: {
          required: true,
          type: 'string',
          enum: ['PersonalIdentity', 'VendorIdentity']
        },
        psaSlug: schemas.slug(),
        label: schemas.label(),
        psaPublic: {
          required: false,
          type: schemas.propertyVisibility()
        }
      }
    },
    account: {
      required: true,
      type: 'object',
      properties: {
        psaSlug: schemas.slug(),
        label: schemas.label(),
        psaPublic: {
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
