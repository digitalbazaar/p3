/*
 * Copyright (c) 2012-2013 Digital Bazaar, Inc. All rights reserved.
 */
var assert = require('assert');
var jsonschema = require('json-schema');

var comment = require('../../schemas/comment');
var nonce = require('../../schemas/nonce');
var resourceHash = require('../../schemas/resourceHash');
var slug = require('../../schemas/slug');
var srvpt = require('../../schemas/services.paymentToken');

// FIXME: add more tests, test for proper errors

module.exports = {
  'when validating a comment': {
    topic: function() {
      return comment();
    },
    'schema exists': function(schema) {
      assert.isObject(schema);
    },
    'empty': function(schema) {
      var result = jsonschema('', schema);
      assert.isFalse(result.valid);
    },
    'too long': function(schema) {
      var result = jsonschema(
        // 257 chars
        '12345678901234567890123456789012345678901234567890' +
        '12345678901234567890123456789012345678901234567890' +
        '12345678901234567890123456789012345678901234567890' +
        '12345678901234567890123456789012345678901234567890' +
        '12345678901234567890123456789012345678901234567890' +
        '1234567',
        schema);
      assert.isFalse(result.valid);
    },
    'just right': function(schema) {
      var small = jsonschema('1', schema);
      assert.isEmpty(small.errors);
      assert.isTrue(small.valid);
      var large = jsonschema(
        // 256 chars
        '12345678901234567890123456789012345678901234567890' +
        '12345678901234567890123456789012345678901234567890' +
        '12345678901234567890123456789012345678901234567890' +
        '12345678901234567890123456789012345678901234567890' +
        '12345678901234567890123456789012345678901234567890' +
        '123456',
        schema);
      assert.isTrue(large.valid);
    },
    'valid content': function(schema) {
      var result = jsonschema(
        '-a-zA-Z0-9~!@#$%^&*()_=+\\|{}[];:\'"<>,./? ',
        schema);
      assert.isTrue(result.valid);
    },
    'invalid content': function(schema) {
      // FIXME: should we allow multiline line comments?
      var result = jsonschema('\n', schema);
      assert.isFalse(result.valid);
    }
  },
  'when validating a nonce': {
    topic: function() {
      return nonce();
    },
    'schema exists': function(schema) {
      assert.isObject(schema);
    },
    'empty': function(schema) {
      var result = jsonschema('', schema);
      assert.isFalse(result.valid);
    },
    'too short': function(schema) {
      var result = jsonschema('1234567', schema);
      assert.isFalse(result.valid);
    },
    'too long': function(schema) {
      var result = jsonschema(
        // 65 chars
        '1234567890123456789012345678901234567890' +
        '1234567890123456789012345',
        schema);
      assert.isFalse(result.valid);
    },
    'just right': function(schema) {
      var small = jsonschema('12345678', schema);
      assert.isTrue(small.valid);
      var large = jsonschema(
        // 64 chars
        '1234567890123456789012345678901234567890' +
        '123456789012345678901234',
        schema);
      assert.isTrue(large.valid);
    },
    'valid content': function(schema) {
      var result = jsonschema('-a-zA-Z0-9~!$%^&*()_=+. ', schema);
      assert.isTrue(result.valid);
    },
    'invalid content': function(schema) {
      var result = jsonschema('|||||||||', schema);
      assert.isFalse(result.valid);
    }
  },
  'when validating a resourceHash': {
    topic: function() {
      return resourceHash();
    },
    'schema exists': function(schema) {
      assert.isObject(schema);
    },
    'empty': function(schema) {
      var result = jsonschema('', schema);
      assert.isFalse(result.valid);
    },
    'too short': function(schema) {
      var short = jsonschema(
        // prefix + 63 chars
        'urn:sha256:' +
        '1234567890123456789012345678901234567890' +
        '12345678901234567890123',
        schema);
      assert.isFalse(short.valid);
    },
    'too long': function(schema) {
      var short = jsonschema(
        // prefix + 65 chars
        'urn:sha256:' +
        '1234567890123456789012345678901234567890' +
        '1234567890123456789012345k',
        schema);
      assert.isFalse(short.valid);
    },
    'just right': function(schema) {
      var large = jsonschema(
        // prefix + 64 chars
        'urn:sha256:' +
        '1234567890123456789012345678901234567890' +
        '123456789012345678901234',
        schema);
      assert.isTrue(large.valid);
    },
    'valid content': function(schema) {
      var result = jsonschema(
        // prefix + 64 chars
        'urn:sha256:' +
        '1234567890123456789012345678901234567890' +
        '123456789012345678901234',
        schema);
      assert.isTrue(result.valid);
    },
    'invalid content': function(schema) {
      var result = jsonschema(
        // prefix + 64 chars
        'urn:sha256:' +
        '1234567890123456789012345678901234567890' +
        '12345678901234567890123x',
        schema);
      assert.isFalse(result.valid);
      var result = jsonschema(
        // prefix + 64 chars
        'urn:sha1:' +
        '1234567890123456789012345678901234567890' +
        '123456789012345678901234',
        schema);
      assert.isFalse(result.valid);
    }
  },
  'when validating a slug': {
    topic: function() {
      return slug();
    },
    'schema exists': function(schema) {
      assert.isObject(schema);
    },
    'empty': function(schema) {
      var result = jsonschema('', schema);
      assert.isFalse(result.valid);
    },
    'too short': function(schema) {
      // 2 chars
      var short = jsonschema('12', schema);
      assert.isFalse(short.valid);
    },
    'too long': function(schema) {
      // 33 chars
      var short = jsonschema(
        '123456789012345678901234567890123',
        schema);
      assert.isFalse(short.valid);
    },
    'just right': function(schema) {
      // 3 chars
      var result = jsonschema('a23', schema);
      assert.isTrue(result.valid);
      // 32 chars
      var result = jsonschema(
        'a2345678901234567890123456789012',
        schema);
      assert.isTrue(result.valid);
    },
    'valid content': function(schema) {
      var result = jsonschema('az-az09~_.', schema);
      assert.isTrue(result.valid);
    },
    'invalid content': function(schema) {
      var result = jsonschema('badchar@', schema);
      assert.isFalse(result.valid);
      var result = jsonschema('0numstart', schema);
      assert.isFalse(result.valid);
    }
  },
  'when validating a paymentTokens POST': {
    topic: function() {
      return srvpt.postPaymentTokens();
    },
    'schema exists': function(schema) {
      assert.isObject(schema);
    },
    'empty': function(schema) {
      var result = jsonschema({}, schema);
      assert.isFalse(result.valid);
    },
    'build valid content': function(schema) {
      var post = {};
      assert.isFalse(jsonschema(post, schema).valid);

      post['@context'] = 'https://w3id.org/payswarm/v1';
      assert.isFalse(jsonschema(post, schema).valid);

      post.label = 'Schema Test';
      assert.isFalse(jsonschema(post, schema).valid);

      post.source = {};
      assert.isFalse(jsonschema(post, schema).valid);

      post.source = {
        '@context': 'https://w3id.org/payswarm/v1',
        type: [],
        bankAccount: '12345',
        bankAccountType: 'Checking',
        bankRoutingNumber: '123456789',
        address: {
          '@context': 'https://w3id.org/payswarm/v1',
          type: 'Address',
          label: 'A1',
          fullName: 'A B',
          streetAddress: '123 Main St',
          locality: 'Blacksburg',
          postalCode: '24060',
          region: 'VA',
          countryName: 'US'
        }
      };
      assert.isFalse(jsonschema(post, schema).valid);

      // wrong type
      post.source.type = 'CreditCard';
      assert.isFalse(jsonschema(post, schema).valid);

      // additional type
      post.source.type = ['BankAccount', 'CreditCard'];
      assert.isFalse(jsonschema(post, schema).valid);

      post.source.type = 'BankAccount';
      assert.isTrue(jsonschema(post, schema).valid);
    },
    'invalid content': function(schema) {
      var result = jsonschema('badchar@', schema);
      assert.isFalse(result.valid);
      var result = jsonschema('0numstart', schema);
      assert.isFalse(result.valid);
    }
  }
};
