/*
 * Copyright (c) 2013 Digital Bazaar, Inc. All rights reserved.
 */
var payswarm = {
  security: require(__libdir + '/payswarm-auth/security', true),
};
var should = require('should');

var privateKey = {
  privateKeyPem: '-----BEGIN RSA PRIVATE KEY-----\r\n' +
  'MIICWwIBAAKBgQC4R1AmYYyE47FMZgo708NhFU+t+VWn133PYGt/WYmD5BnKj679\r\n' +
  'YiUmyrC3hX6oZfo4eVpOkycxZvGgXCLQGuDp45XfZkdsjqs3o62En4YjlHWxgeGm\r\n' +
  'kiRqGfZ3sJ3u5WZ2xwapdZY3/2T/oOV5ri8SktTvmVGCyhwFuJC/NbJMEwIDAQAB\r\n' +
  'AoGAZXNdPMQXiFGSGm1S1P0QYzJIW48ZCP4p1TFP/RxeCK5bRJk1zWlq6qBMCb0E\r\n' +
  'rdD2oICupvN8cEYsYAxZXhhuGWZ60vggbqTTa+4LXB+SGCbKMX711ZoQHdY7rnaF\r\n' +
  'b/Udf4wTLD1yAslx1TrHkV56OfuJcEdWC7JWqyNXQoxedwECQQDZvcEmBT/Sol/S\r\n' +
  'AT5ZSsgXm6xCrEl4K26Vyw3M5UShRSlgk12gfqqSpdeP5Z7jdV/t5+vD89OJVfaa\r\n' +
  'Tw4h9BibAkEA2Khe03oYQzqP1V4YyV3QeC4yl5fCBr8HRyOMC4qHHKQqBp2VDUyu\r\n' +
  'RBJhTqqf1ErzUBkXseawNxtyuPmPrMSl6QJAQOgfu4W1EMT2a1OTkmqIWwE8yGMz\r\n' +
  'Q28u99gftQRjAO/s9az4K++WSUDGkU6RnpxOjEymKzNzy2ykpjsKq3RoIQJAA+XL\r\n' +
  'huxsYVE9Yy5FLeI1LORP3rBJOkvXeq0mCNMeKSK+6s2M7+dQP0NBYuPo6i3LAMbi\r\n' +
  'yT2IMAWbY76Bmi8TeQJAfdLJGwiDNIhTVYHxvDz79ANzgRAd1kPKPddJZ/w7Gfhm\r\n' +
  '8Mezti8HCizDxPb+H8HlJMSkfoHx1veWkdLaPWRFrA==\r\n' +
  '-----END RSA PRIVATE KEY-----'
};
var publicKey = {
  id: 'http://payswarm.dev/i/username/keys/1',
  publicKeyPem:
  '-----BEGIN PUBLIC KEY-----\r\n' +
  'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC4R1AmYYyE47FMZgo708NhFU+t\r\n' +
  '+VWn133PYGt/WYmD5BnKj679YiUmyrC3hX6oZfo4eVpOkycxZvGgXCLQGuDp45Xf\r\n' +
  'Zkdsjqs3o62En4YjlHWxgeGmkiRqGfZ3sJ3u5WZ2xwapdZY3/2T/oOV5ri8SktTv\r\n' +
  'mVGCyhwFuJC/NbJMEwIDAQAB\r\n' +
  '-----END PUBLIC KEY-----'
};

var testObject = {
  '@context': 'https://w3id.org/payswarm/v1',
  'http://example.com/foo': 'bar'
};

// See the NOTE in the tests if this must be regenerated.
var encryptedMessage = {"@context":"https://w3id.org/payswarm/v1","type":"EncryptedMessage","cipherData":"R2pzAJFdyfB7axkttfo9qFISUTP4eQv5wiLvHnUXPH3XW31Ss+uTJ1ZA6EhAOGoZxB5CTM8ghAEEz0Og97YKhTFIB6mRMOtn1nYcw7KJ0iQ=","cipherAlgorithm":"rsa-sha256-aes-128-cbc","cipherKey":"dHaygBWcIaGpigMBj5L4BBIabA+nCycMmScl2TB2tfpS8+0/KDunrJ1Xou/MvJFXNhPvwDvpQksMm13+pn3XXuL0Stc7fGckDwlM4Ps91SLPN1oohYR+UEUGofVwF3CzDqapMk8O1vs8SgM2RxhLPEGZLdmUgVGQ1j+M6VVxhP4=","initializationVector":"VjAJ4osKcKnnM80Yjqjpb7K4BUubfwh/0ns2KmpP7jrpVkD0LYl1yNGKV67o7AyVA1KFLQrlwhDe+c1Z7rRTkjcoD5iMh40ZzsZjcZlWPjBuVoWA02h0qDA7D+K7aqDukfZtmMW22t7nlnzR4KEmPR1vGMVCsN7Bl6bN8GoyxoE=","publicKey":"http://payswarm.dev/i/username/keys/1"};

var testPasswordHash = 'bcrypt:$2a$10$hjp3zswzxnOV9A1gui//COzuM/.AG4hArsQEiAIA1nUION1hQ5W12';

describe('payswarm.security', function() {
  describe('JSON-LD hashing', function() {
    it('should generate the correct hash', function(done) {
      payswarm.security.hashJsonLd(testObject, null, function(err, hash) {
        should.not.exist(err);
        hash.should.equal('urn:sha256:' +
        '63ca27944af9deea730890d72c1d0e8e3674436073e883c761fded6f621e77dd');
        done();
      });
    });
  });

  describe('JSON-LD signatures', function() {
    it('should be verifiable', function(done) {
      payswarm.security.signJsonLd(
        testObject, privateKey, publicKey.id, function(err, signed) {
          should.not.exist(err);
          payswarm.security.verifyJsonLd(signed, publicKey,
            function(err, verified) {
              should.not.exist(err);
              verified.should.be.true;
              done();
        });
      });
    });
  });

  describe('JSON-LD decryption', function() {
    it('should retrieve the original message', function(done) {
      payswarm.security.decryptJsonLd(
        encryptedMessage, privateKey, function(err, msg) {
          should.not.exist(err);
          msg.should.eql(testObject);
          done();
      });
    });
  });

  describe('JSON-LD encryption-decryption roundtrip', function() {
    it('should result in the original message', function(done) {
      payswarm.security.encryptJsonLd(
        testObject, publicKey, function(err, msg) {
        should.not.exist(err);
        payswarm.security.decryptJsonLd(msg, privateKey, function(err, msg) {
          should.not.exist(err);
          msg.should.eql(testObject);
          done();
        });
      });
    });
  });

  describe('JSON-LD password hashing', function() {
    it('should generate non-legacy, valid hashes', function(done) {
      payswarm.security.createPasswordHash('password', function(err, hash) {
        should.not.exist(err);
        payswarm.security.verifyPasswordHash(hash, 'password',
          function(err, verified, legacy) {
            should.not.exist(err);
            legacy.should.be.false;
            verified.should.be.true;
            done();
        });
      });
    });

    it('should validate non-legacy, valid hashes', function(done) {
      payswarm.security.verifyPasswordHash(
        testPasswordHash, 'password', function(err, verified, legacy) {
          should.not.exist(err);
          legacy.should.be.false;
          verified.should.be.true;
          done();
      });
    });
  });
});

/*
module.exports = {
  'when verifying a previously created test password hash': {
    topic: function() {
      var self = this;
      payswarm.security.verifyPasswordHash(
        testPasswordHash, 'password', self.callback);
    },
    'we get no error': function(err, verified, legacy) {
      assert.isNull(err || null);
    },
    'we get that the hash is not legacy': function(err, verified, legacy) {
      assert.equal(legacy, false);
    },
    'we get verified is true': function(err, verified, legacy) {
      assert.equal(verified, true);
    }
  }
};
*/
