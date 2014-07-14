/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */

'use strict';

// FIXME: dirs crazy
var jsonschema = require('json-schema');
var money = require('../../schemas/money');
var resourceHash = require('../../schemas/resourceHash');
var servicesPaymentToken = require('../../schemas/services.paymentToken');

// FIXME: add more tests, test for proper errors
describe('PaySwarm JSON-LD REST API input schema', function() {
  describe('precise money', function() {
    var schema = money.precise();
    it('should be an Object', function(done) {
      schema.should.be.an.instanceof(Object);
      done();
    });
    it('should reject empty', function(done) {
      var result = jsonschema('', schema);
      result.valid.should.be.false;
      done();
    });
    it('should reject leading 0', function(done) {
      var result = jsonschema('01.00', schema);
      result.valid.should.be.false;
      done();
    });
    it('should accept zero', function(done) {
      jsonschema('0', schema).valid.should.be.true;
      jsonschema('0.', schema).valid.should.be.true;
      jsonschema('0.0', schema).valid.should.be.true;
      jsonschema('0.00', schema).valid.should.be.true;
      jsonschema('.0', schema).valid.should.be.true;
      jsonschema('.00', schema).valid.should.be.true;
      done();
    });
    it('should accept negative', function(done) {
      jsonschema('-1', schema).valid.should.be.true;
      jsonschema('-1.', schema).valid.should.be.true;
      jsonschema('-1.0', schema).valid.should.be.true;
      jsonschema('-.1', schema).valid.should.be.true;
      done();
    });
    it('should accept positive', function(done) {
      jsonschema('1', schema).valid.should.be.true;
      jsonschema('1.0', schema).valid.should.be.true;
      jsonschema('0.1', schema).valid.should.be.true;
      jsonschema('.1', schema).valid.should.be.true;
      done();
    });
  });

  describe('precise positive money', function() {
    var schema = money.precisePositive();
    it('should be an Object', function(done) {
      schema.should.be.an.instanceof(Object);
      done();
    });
    it('should reject empty', function(done) {
      var result = jsonschema('', schema);
      result.valid.should.be.false;
      done();
    });
    it('should reject leading 0', function(done) {
      var result = jsonschema('01.00', schema);
      result.valid.should.be.false;
      done();
    });
    it('should reject zero', function(done) {
      jsonschema('0', schema).valid.should.be.false;
      jsonschema('0.', schema).valid.should.be.false;
      jsonschema('0.0', schema).valid.should.be.false;
      jsonschema('0.00', schema).valid.should.be.false;
      jsonschema('.0', schema).valid.should.be.false;
      jsonschema('.00', schema).valid.should.be.false;
      done();
    });
    it('should reject negative', function(done) {
      jsonschema('-1', schema).valid.should.be.false;
      jsonschema('-1.', schema).valid.should.be.false;
      jsonschema('-1.0', schema).valid.should.be.false;
      jsonschema('-.1', schema).valid.should.be.false;
      done();
    });
    it('should accept positive', function(done) {
      jsonschema('1', schema).valid.should.be.true;
      jsonschema('1.0', schema).valid.should.be.true;
      jsonschema('0.1', schema).valid.should.be.true;
      jsonschema('.1', schema).valid.should.be.true;
      done();
    });
  });

  describe('precise nonnegative money', function() {
    var schema = money.preciseNonNegative();
    it('should be an Object', function(done) {
      schema.should.be.an.instanceof(Object);
      done();
    });
    it('should reject empty', function(done) {
      var result = jsonschema('', schema);
      result.valid.should.be.false;
      done();
    });
    it('should reject leading 0', function(done) {
      var result = jsonschema('01.00', schema);
      result.valid.should.be.false;
      done();
    });
    it('should accept zero', function(done) {
      jsonschema('0', schema).valid.should.be.true;
      jsonschema('0.', schema).valid.should.be.true;
      jsonschema('0.0', schema).valid.should.be.true;
      jsonschema('0.00', schema).valid.should.be.true;
      jsonschema('.0', schema).valid.should.be.true;
      jsonschema('.00', schema).valid.should.be.true;
      done();
    });
    it('should reject negative', function(done) {
      jsonschema('-1', schema).valid.should.be.false;
      jsonschema('-1.', schema).valid.should.be.false;
      jsonschema('-1.0', schema).valid.should.be.false;
      jsonschema('-.1', schema).valid.should.be.false;
      done();
    });
    it('should accept positive', function(done) {
      jsonschema('1', schema).valid.should.be.true;
      jsonschema('1.0', schema).valid.should.be.true;
      jsonschema('0.1', schema).valid.should.be.true;
      jsonschema('.1', schema).valid.should.be.true;
      done();
    });
  });

  describe('resourceHash', function() {
    var schema = resourceHash();
    it('should be an Object', function(done) {
      schema.should.be.an.instanceof(Object);
      done();
    });
    it('should reject empty resourceHashes', function(done) {
      var result = jsonschema('', schema);
      result.valid.should.be.false;
      done();
    });
    it('should reject resourceHashes that are too short', function(done) {
      var result = jsonschema(
        // prefix + 63 chars
        'urn:sha256:' +
        '123456789012345678901234567890123456789012345678901234567890123',
        schema);
      result.valid.should.be.false;
      done();
    });
    it('should reject resourceHashes that are too long', function(done) {
      var result = jsonschema(
        // prefix + 65 chars
        'urn:sha256:' +
        '12345678901234567890123456789012345678901234567890123456789012345k',
        schema);
      result.valid.should.be.false;
      done();
    });
    it('should accept valid resourceHashes', function(done) {
      var result = jsonschema(
        // prefix + 64 chars
        'urn:sha256:' +
        '1234567890123456789012345678901234567890123456789012345678901234',
        schema);
      result.valid.should.be.true;
      done();
    });
    it('should reject invalid characters', function(done) {
      var result = jsonschema(
        // prefix + 64 chars (including invalid 'x')
        'urn:sha256:' +
        '123456789012345678901234567890123456789012345678901234567890123x',
        schema);
      result.valid.should.be.false;
      done();
    });
    it('should reject invalid hash algorithms', function(done) {
      var result = jsonschema(
        // invalid sha1 prefix + 64 chars
        'urn:sha1:' +
        '1234567890123456789012345678901234567890123456789012345678901234',
        schema);
      result.valid.should.be.false;
      done();
    });
  });

  describe('postPaymentToken', function() {
    var schema = servicesPaymentToken.postPaymentTokens();
    it('should be an Object', function(done) {
      schema.should.be.an.instanceof(Object);
      done();
    });
    it('should reject empty paymentTokens', function(done) {
      var result = jsonschema('', schema);
      result.valid.should.be.false;
      done();
    });
    it('should require multiple pieces of information', function(done) {
      var post = {};
      jsonschema(post, schema).valid.should.be.false;

      post['@context'] = 'https://w3id.org/payswarm/v1';
      jsonschema(post, schema).valid.should.be.false;

      post.label = 'Schema Test';
      jsonschema(post, schema).valid.should.be.false;

      post.source = {};
      jsonschema(post, schema).valid.should.be.false;

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
          name: 'A B',
          streetAddress: '123 Main St',
          addressLocality: 'Blacksburg',
          postalCode: '24060',
          addressRegion: 'VA',
          addressCountry: 'US'
        }
      };
      jsonschema(post, schema).valid.should.be.false;

      // wrong type
      post.source.type = 'CreditCard';
      jsonschema(post, schema).valid.should.be.false;

      // additional type
      post.source.type = ['BankAccount', 'CreditCard'];
      jsonschema(post, schema).valid.should.be.false;

      post.source.type = 'BankAccount';
      jsonschema(post, schema).valid.should.be.true;
      done();
    });
    it('should reject invalid input', function(done) {
      // FIXME: Not enough invalid input tests, need more bad examples
      var result = jsonschema('badchar@', schema);
      result.valid.should.be.false;
      var result = jsonschema('0numstart', schema);
      result.valid.should.be.false;
      done();
    });
  });
});
