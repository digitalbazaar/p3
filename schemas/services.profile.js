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
    'psa:identifier': {
      required: true,
      type: [slug(), email()]
    }
  }
};

var postPassword = {
  type: 'object',
  properties: {
    '@id': payswarmId(),
    'psa:password': password(),
    'psa:passwordNew': password()
  }
};

var postPasswordReset = {
  type: 'object',
  properties: {
    'psa:identifier': {
      required: true,
      type: [slug(), email()]
    },
    'psa:passcode': passcode(),
    'psa:passwordNew': password()
  }
};

var postCreate = {
  type: 'object',
  properties: {
    'psa:slug': slug(),
    'foaf:mbox': email(),
    'psa:password': password(),
    'rdfs:label': label(),
    'psa:identity': {
      required: true,
      type: 'object',
      '@type': {
        required: true,
        type: 'string',
        enum: ['ps:PersonalIdentity', 'ps:VendorIdentity']
      },
      'psa:slug': slug(),
      'rdfs:label': label()
    },
    'com:account': {
      required: true,
      type: 'object',
      'psa:slug': slug(),
      'rdfs:label': label()
    }
  }
};

var postLogin = {
  type: [{
    type: 'object',
    properties: {
      'profile': {
        required: true,
        type: [slug(), email()]
      },
      'password': password(),
      'ref': url({required: false})
    }
  }, {
    type: 'object',
    properties: {
      'profilename': slug(),
      'password': password(),
      'ref': url({required: false})
    }
  }]
};

var postProfile = {
  type: 'object',
  properties: {
    'rdfs:label': label({required: false}),
    'foaf:mbox': email({required: false}),
    'foaf:gender': {
      required: false,
      type: 'string'
    },
    'foaf:page': url({required: false}),
    'foaf:based_near': {
      required: false,
      type: 'string'
    },
    'psa:bio': {
      required: false,
      type: 'string'
    }
  }
};

var switchIdentity = {
  type: 'object',
  properties: {
    'identity': payswarmId(),
    'redirect': url()
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
