/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var bedrock = require('bedrock');
var jsonld = require('./jsonld'); // use locally-configured jsonld
var payswarm = {
  config: bedrock.config,
  constants: bedrock.config.constants,
  financial: require('./financial'),
  identity: bedrock.modules['bedrock.identity'],
  logger: bedrock.loggers.get('app'),
  money: require('./money'),
  tools: require('./tools'),
  validation: bedrock.validation
};
var Money = payswarm.money.Money;
var BedrockError = payswarm.tools.BedrockError;
var validate = payswarm.validation.validate;

// constants
var MODULE_NS;

// sub module API
var api = {};
module.exports = api;

/**
 * Initializes this module.
 *
 * @param app the application to initialize this module for.
 * @param callback(err) called once the operation completes.
 */
api.init = function(app, callback) {
  payswarm.website = bedrock.modules['bedrock.website'];
  MODULE_NS = payswarm.website.namespace;
  addServices(app, callback);
};

/**
 * Adds web services to the server.
 *
 * @param app the payswarm-auth application.
 * @param callback(err) called once the services have been added to the server.
 */
function addServices(app, callback) {
  var ensureAuthenticated = payswarm.website.ensureAuthenticated;

  app.server.post('/i/:identity/payment-tokens',
    ensureAuthenticated,
    validate('services.paymentToken.postPaymentTokens'),
    function(req, res, next) {
      var token = {
        '@context': payswarm.constants.CONTEXT_URL,
        type: 'PaymentToken',
        label: req.body.label
      };
      async.waterfall([
        function(callback) {
          // get identity ID from URL
          var identityId =
            payswarm.identity.createIdentityId(req.params.identity);
          callback(null, identityId);
        },
        function(identityId, callback) {
          token.owner = identityId;

          // create paymentToken ID
          payswarm.financial.generatePaymentTokenId(identityId, callback);
        },
        function(paymentTokenId, callback) {
          token.id = paymentTokenId;

          // create paymentToken
          payswarm.financial.createPaymentToken(
            req.user.identity, {
              source: req.body.source,
              gateway: null,
              token: token
            }, callback);
        }
      ], function(err, record) {
        if(err) {
          var httpStatusCode = 500;
          if(err.details && err.details.httpStatusCode) {
            httpStatusCode = err.details.httpStatusCode;
          }
          return next(new BedrockError(
            'The payment method could not be added.',
            MODULE_NS + '.AddPaymentTokenFailed',
            {'public': true, httpStatusCode: httpStatusCode}, err));
        }
        // return payment token
        res.set('Location', record.paymentToken.id);
        res.json(201, record.paymentToken);
      });
  });

  app.server.get('/i/:identity/payment-tokens', ensureAuthenticated,
    validate({query: 'services.paymentToken.getPaymentTokensQuery'}),
    function(req, res, next) {
      // get identity ID from URL
      var identityId = payswarm.identity.createIdentityId(req.params.identity);

      // get gateway
      var gateway = req.query.gateway || null;

      // get payment tokens
      payswarm.financial.getIdentityPaymentTokens(
        req.user.identity, identityId, gateway, function(err, records) {
          if(err) {
            return next(err);
          }
          var tokens = [];
          records.forEach(function(record) {
            tokens.push(record.paymentToken);
          });
          res.json(tokens);
        });
  });

  app.server.get('/i/:identity/payment-tokens/:paymentToken',
    ensureAuthenticated,
    function(req, res, next) {
      // get identity and token IDs from URL
      var identityId = payswarm.identity.createIdentityId(req.params.identity);
      var tokenId = payswarm.financial.createPaymentTokenId(
        identityId, req.params.paymentToken);

      // get payment token
      payswarm.financial.getPaymentToken(
        req.user.identity, tokenId, function(err, token, meta) {
          if(err) {
            return next(err);
          }
          // FIXME: add payment token HTML output
          res.json(token);
        });
  });

  app.server.post('/i/:identity/payment-tokens/:paymentToken',
    ensureAuthenticated,
    validate({query: 'services.paymentToken.postPaymentTokenQuery'}),
    function(req, res, next) {
      // restore payment token
      if(req.query.action === 'restore') {
        // get IDs from URL
        var identityId = payswarm.identity.createIdentityId(req.params.identity);
        var tokenId = payswarm.financial.createPaymentTokenId(
          identityId, req.params.paymentToken);
        return payswarm.financial.restorePaymentToken(
          req.user.identity, tokenId, function(err, record) {
            if(err) {
              return next(new BedrockError(
                'The payment method could not be restored.',
                MODULE_NS + '.RestorePaymentTokenFailed', {
                  'public': true
                }, err));
            }
            res.send(200, record.paymentToken);
          });
      }

      if(req.query.action === 'verify') {
        // invalid body
        if(!req.body || (typeof req.body !== 'object')) {
          return validate('services.paymentToken.postVerify')(req, res, next);
        }

        var isDeposit = jsonld.hasValue(req.body, 'type', 'Deposit');
        var validator = 'services.paymentToken.' + (isDeposit ?
          'postVerifyDeposit' : 'postVerifyPrepare');
        return validate(validator)(req, res, function(err) {
          if(err) {
            return next(err);
          }
          if(isDeposit) {
            _processPaymentTokenDeposit(req, res, next);
          } else {
            _preparePaymentTokenDeposit(req, res, next);
          }
        });
      }

      // check body data
      var validator = 'services.paymentToken.postPaymentToken';
      return validate(validator)(req, res, function(err) {
        if(err) {
          return next(err);
        }
        _updatePaymentToken(req, res, next);
      });

      // no other supported actions
      //next();
  });

  app.server.del('/i/:identity/payment-tokens/:paymentToken',
    ensureAuthenticated,
    function(req, res, next) {
      // get IDs from URL
      var identityId = payswarm.identity.createIdentityId(req.params.identity);
      var paymentTokenId = payswarm.financial.createPaymentTokenId(
        identityId, req.params.paymentToken);

      // remove payment token
      payswarm.financial.removePaymentToken(
        req.user.identity, paymentTokenId, function(err, record) {
          if(err) {
            return next(err);
          }
          if(record) {
            return res.send(200, record.paymentToken);
          }
          res.send(204);
        });
  });

  callback(null);
}

function _preparePaymentTokenDeposit(req, res, next) {
  // get IDs from URL
  var identityId = payswarm.identity.createIdentityId(req.params.identity);
  var tokenId = payswarm.financial.createPaymentTokenId(
    identityId, req.params.paymentToken);

  // get verify parameters
  var amounts = req.body.sysVerifyParameters.amount;

  return async.waterfall([
    function(callback) {
      // run verification w/o updating token
      payswarm.financial.verifyPaymentToken(
        req.user.identity, tokenId, {amounts: amounts, update: false},
        function(err) {
          if(err) {
            return callback(new BedrockError(
              'The payment method could not be verified.',
              MODULE_NS + '.VerifyPaymentTokenFailed', {
                'public': true
              }, err));
          }
          callback(err);
        });
    },
    function(callback) {
      // token verified, build deposit
      var deposit = {
        type: ['Transaction', 'Deposit'],
        payee: [],
        source: tokenId,
        // include client IP
        ipv4Address: req.ip
      };

      // Note: ACH deposits disabled because may accrue stored value and
      // do not clear for several days (would potentially lock someone out
      // of depositing until it cleared)

      // add initial deposit payee if given
      /*if(req.body.destination && req.body.amount) {
        jsonld.addValue(deposit, 'payee', {
          type: 'Payee',
          destination: req.body.destination,
          currency: 'USD',
          payeeGroup: [
            'deposit', 'authority_gateway', 'authority_gatewayFlatExempt'],
          payeeRate: new Money(req.body.amount).toString(),
          payeeRateType: 'FlatAmount',
          payeeApplyType: 'ApplyExclusively',
          comment: 'Deposit'
        });
      }*/

      // Assumption: no call to payswarm.financial.updateAccountBalanceSnapshot
      // because destinations are all authority destinations

      // sign the deposit for review
      payswarm.financial.signDeposit(
        null, deposit, {verify: true, amounts: amounts}, function(err, signed) {
          if(err) {
            return next(err);
          }
          signed['@context'] = payswarm.constants.CONTEXT_URL;
          res.json(signed);
        });
    }
  ], function(err) {
    if(err) {
      next(err);
    }
  });
}

function _processPaymentTokenDeposit(req, res, next) {
  // get IDs from URL
  var identityId = payswarm.identity.createIdentityId(req.params.identity);
  var tokenId = payswarm.financial.createPaymentTokenId(
    identityId, req.params.paymentToken);

  // deposit already signed, process it
  payswarm.financial.processDeposit(
    req.user.identity, req.body, {request: req}, function(err, deposit) {
      if(err) {
        return next(err);
      }

      // force verification of payment token
      payswarm.financial.verifyPaymentToken(
        req.user.identity, tokenId, {update: true, force: true},
        function(err) {
          if(err) {
            // emit error event
            payswarm.events.emit({
              type: 'common.PaymentToken.verifyFailed',
              details: {
                tokenId: tokenId
              }
            });

            return callback(err);
          }

          res.set('Location', deposit.id);
          res.json(201, deposit);
        });
    });
}

function _updatePaymentToken(req, res, next) {
  // get IDs from URL
  var identityId = payswarm.identity.createIdentityId(req.params.identity);
  var tokenId = payswarm.financial.createPaymentTokenId(
    identityId, req.params.paymentToken);

  // setup paymentToken changes
  var changes = payswarm.tools.clone(req.body);
  changes.id = tokenId;

  // do update
  async.waterfall([
    function(callback) {
      payswarm.financial.updatePaymentToken(
        req.user.identity, changes, callback);
    }
  ], function(err) {
    if(err) {
      return next(err);
    }
    res.send(204);
  });
}
