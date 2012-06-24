/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var jsonld = require('jsonld');
var util = require('util');
var payswarm = {
  asset: require('./payswarm.resource'),
  config: require('../payswarm.config'),
  db: require('./payswarm.database'),
  financial: require('./payswarm.financial'),
  identity: require('./payswarm.identity'),
  logger: require('./payswarm.loggers').get('app'),
  money: require('./payswarm.money'),
  permission: require('./payswarm.permission'),
  profile: require('./payswarm.profile'),
  resource: require('./payswarm.resource'),
  security: require('./payswarm.security'),
  tools: require('./payswarm.tools')
};
var PaySwarmError = payswarm.tools.PaySwarmError;
var Money = payswarm.money.Money;

// constants
var MODULE_TYPE = payswarm.financial.type;
var MODULE_IRI = payswarm.financial.iri;

// sub module API
var api = {};
module.exports = api;

/**
 * Initializes this module.
 *
 * @param callback(err) called once the operation completes.
 */
api.init = function(callback) {
  // do initialization work
  async.waterfall([
    function(callback) {
      // open all necessary collections
      payswarm.db.openCollections(['contractCache'], callback);
    },
    function(callback) {
      // setup collections (create indexes, etc)
      payswarm.db.createIndexes([{
        // ID
        collection: 'contractCache',
        fields: {id: true},
        options: {unique: true, background: true}
      }], callback);
    },
    function(callback) {
      // FIXME: add listener for cleanup cached contract events
      callback();
    }
  ], callback);
};

/**
 * Creates and populates a new Contract. The Asset acquirer will not be set
 * on the contract until it is signed.
 *
 * If a Listing ID is provided, the Listing will be retrieved, otherwise
 * a the full Listing must be provided. An asset and license may be provided,
 * otherwise they will be retrieved. Providing these options optimize away
 * retrievals.
 *
 * @param actor the profile performing the action.
 * @param options:
 *          listingId: the Listing ID (to look up Listing).
 *          listing: the full Listing (to use given Listing).
 *          listingHash: the Listing hash.
 *          asset: the Asset (optional, will be retrieved otherwise).
 *          license: the License (optional, will be retrieved otherwise).
 *          referenceId: the reference ID to use (optional).
 * @param callback(err, contract) called once the operation completes.
 */
api.createContract = function(actor, options, callback) {
  // FIXME: handle permissions

  async.auto({
    getListing: function(callback) {
      if(options.listing) {
        return callback(null, options.listing);
      }
      // populate listing
      var query = {
        id: options.listingId,
        hash: options.listingHash,
        type: 'ps:Listing',
        strict: true,
        fetch: true
      };
      payswarm.resource.listing.get(query, function(err, records) {
        if(err) {
          return callback(err);
        }
        var listing = records[0].resource;
        payswarm.logger.debug(
          'create contract listing',
          options.listingId, options.listingHash, listing);
        callback(null, listing);
      });
    },
    getAsset: ['getListing', function(callback, results) {
      if(options.asset) {
        return callback(null, options.asset);
      }
      // populate asset
      var listing = results.getListing;
      var query = {
        id: listing.asset,
        hash: listing.assetHash,
        type: 'ps:Asset',
        strict: true,
        fetch: true
      };
      payswarm.resource.asset.get(query, function(err, records) {
        if(err) {
          return callback(err);
        }
        var asset = records[0].resource;
        callback(null, asset);
      });
    }],
    getLicense: ['getListing', function(callback, results) {
      if(options.license) {
        return callback(null, options.license);
      }
      // populate license
      var listing = results.getListing;
      var query = {
        id: listing.license,
        hash: listing.licenseHash,
        type: 'ps:License',
        strict: true,
        fetch: true
      };
      payswarm.resource.license.get(query, function(err, records) {
        if(err) {
          return callback(err);
        }
        var license = records[0].resource;
        callback(null, license);
      });
    }],
    getAssetProvider: ['getAsset', function(callback, results) {
      var asset = results.getAsset;
      var id = payswarm.tools.clone(asset.assetProvider);
      if(payswarm.tools.isObject(id)) {
        id = id.id;
      }
      payswarm.identity.getIdentity(null, id, function(err, identity) {
        if(err) {
          return callback(new PaySwarmError(
            'The Asset provider\'s information was not found at the ' +
            'provided PaySwarm Authority.',
            MODULE_TYPE + '.AssetProviderNotFound', {
              'public': true,
              authority: payswarm.config.authority.id,
              assetProvider: id
            }, err));
        }
        // add basic public asset provider information
        var assetProvider = {
          id: identity.id,
          label: identity.label,
          homepage: identity.homepage,
          description: identity.description
        };
        // FIXME: skip 'ps:assetProviderIdentity' (hash) until its issues
        // are resolved
        callback(null, assetProvider);
      });
    }]
  }, function(err, results) {
    var listingId = options.listingId || options.listing.id;
    payswarm.logger.debug(
      'create contract', listingId, options.listingHash,
      'success: ' + (!!err));
    if(err) {
      return callback(err);
    }
    var contract = {
      type: ['com:Transaction', 'ps:Contract'],
      created: payswarm.tools.w3cDate(),
      listing: results.getListing,
      listingHash: options.listingHash,
      asset: results.getAsset,
      license: results.getLicense,
      assetProvider: results.getAssetProvider
    };
    callback(null, contract);
  });
};

/**
 * Attempts to add a Payee to a Contract. If the Payee is valid and the
 * Contract's Listing's Payee Rules permit the Payee to be added, it will
 * be. If not, an error will be raised.
 *
 * This must be called before finalizing the Contract.
 *
 * @param contract the Contract to add a Payee to.
 * @param payee the Payee to add.
 * @param options:
 *          maximizeRate: true to try to maximize the Payee's rate based on
 *            the given Payee Rules, false not to (default: false).
 *          ownerType: the owner type for the Payee destination account,
 *            (default: 'identity', other option: 'authority').
 * @param callback(err) called once the operation completes.
 */
api.addPayeeToContract = function(contract, payee, options, callback) {
  // get payee rules
  var listing = contract.listing;
  var rules = jsonld.getValues(listing, 'payeeRule');
  // if there are no payee rules, default behavior is prohibit adding payees
  if(rules.length === 0) {
    return callback(new PaySwarmError(
      'Could not add Payee to Contract. The Listing has no Payee rules, ' +
      'which indicates that no Payees may be added to the Contract.',
      MODULE_TYPE + '.NoPayeeRules'));
  }

  // attempt to maximize rate if requested
  var max = new Money(payee.payeeRate);

  // ensure that the given payee meets at least one payee rule
  var pass = false;
  for(var i in rules) {
    var rule = rules[i];

    // if a limitation of no additional payees is detected, disallow
    // adding the payee
    if('payeeLimitation' in rule) {
      if(rule.payeeLimitation === 'com:NoAdditionalPayees') {
        break;
      }
      // no other limitations are supported, and if found, automatically
      // deny adding any other payees
      break;
    }

    if(payswarm.tools.checkPayeeRule(rule, payee, options.ownerType)) {
      pass = true;

      // update maximum rate
      if('maxmimumPayeeRate' in rule) {
        var tmp = new Money(rule.maximumPayeeRate);
        if(tmp.compareTo(max) > 0) {
          max = tmp;
        }
      }
    }
  }

  if(!pass) {
    return callback(new PaySwarmError(
      'Could not add Payee to Contract. The Listing has no Payee rule ' +
      'that permits the given Payee to be added to the Contract.',
      MODULE_TYPE + '.ProhibitedByPayeeRules'));
  }

  // update rate to maximum rules allow if requested
  if(options.maximizeRate) {
    payee.payeeRate = max.toString();
  }

  // payee passes a payee rule, append it
  contract.payee = payswarm.tools.sortPayees(contract.payee);
  payswarm.tools.appendPayee(contract.payee, payee);
  callback();
};

/**
 * Creates a new PayeeScheme ID based on the owner's Identity ID and the
 * given name (slug).
 *
 * @param ownerId the ID of the PayeeScheme owner.
 * @param name the name of the PayeeScheme (slug).
 *
 * @return the PayeeScheme ID.
 */
api.createPayeeSchemeId = function(ownerId, name) {
  return util.format('%s/payee-schemes/%s', ownerId, encodeURIComponent(name));
};

/**
 * Adds the Payees from a particular PayeeScheme to the given Contract.
 *
 * This must be called before finalizing the Contract.
 *
 * @param contract the Contract to add the Payees to.
 * @param psId the ID of the PayeeScheme to add Payees from.
 * @param options:
 *          maximizeRate: true to try to maximize the Payee's rate based on
 *            the given Payee Rules, false not to (default: false).
 *          ownerType: the owner type for the Payee destination account,
 *            (default: 'identity', other option: 'authority').
 * @param callback(err, contract) called once the operation completes.
 */
api.addPayeeSchemeToContract = function(contract, psId, options, callback) {
  // check payee scheme existence
  if(!(psId in payswarm.config.financial.payeeSchemes)) {
    return callback(new PaySwarmError(
      'PayeeScheme not found.',
      MODULE_TYPE + '.PayeeSchemeNotFound'));
  }

  var ps = payswarm.config.financial.payeeSchemes[psId];
  payswarm.logger.debug('add payee scheme to contract', ps);

  // add each payee
  var payees = jsonld.getValues(ps, 'payee');
  async.forEachSeries(payees, function(payee, callback) {
    // FIXME: check to ensure owner type is correct?
    api.addPayeeToContract(contract, payee, options, callback);
  }, function(err) {
    if(err) {
      return callback(err);
    }
    callback(null, contract);
  });
};

/**
 * Validates and finalizes a Contract. This method will not actually process
 * the Contract, it will just assign it a unique ID, set its Asset acquirer,
 * populate its list of Transfers, set a total, and check appropriate
 * information. To process the Contract, call processContract() after it has
 * been reviewed and found to be acceptable by the appropriate Asset
 * provider.
 *
 * The Contract will be cached and can be later retrieved using a call to
 * getCachedContract().
 *
 * After the call returns successfully, the Contract will be the
 * "Asset acquirer's version" and it should not be given to the Asset
 * provider because it will contain identity information.
 *
 * @param actor the profile performing the action.
 * @param contract the Contract to finalize.
 * @param options:
 *          acquirer: the Asset acquirer to use.
 *          acquirerAccountId: the Asset acquirer's Account ID.
 * @param callback(err, contract) called once the operation completes.
 */
api.finalizeContract = function(actor, contract, options, callback) {
  // FIXME: handle permissions (this includes that an asset acquirer should
  // not have the permission to do a contract if they haven't set their
  // address yet)

  async.auto({
    getAcquirer: function(callback) {
      // populate asset acquirer if identity address not present
      if('address' in options.acquirer) {
        return callback(null, payswarm.tools.clone(options.acquirer));
      }
      payswarm.identity.getIdentity(
        actor, options.acquirer.id, function(err, identity) {
          callback(err, identity);
        });
    },
    checkSourceAccount: function(callback) {
      // ensure asset acquirer owns the source financial account
      payswarm.financial.getAccount(
        actor, options.acquirerAccountId, function(err, account) {
          if(err) {
            return callback(err);
          }
          if(options.acquirer.id !== account.owner) {
            return callback(new PaySwarmError(
              'The Asset acquirer does not own the source FinancialAccount.',
              MODULE_TYPE + '.InvalidSourceAccount'));
          }
          callback();
        });
    },
    generateId: function(callback) {
      payswarm.financial.generateTransactionId(callback);
    }
  }, function(err, results) {
    if(err) {
      return callback(err);
    }

    // Note: Asset and Listing are assumed valid and correctly signed.

    contract.id = results.generateId;
    contract.assetAcquirer = {
      id: results.getAcquirer.id,
      address: results.getAcquirer.address
    };

    // create list of payees to produce transfers
    // add listing and then contract-specific payees
    var listing = contract.listing;
    var payees = jsonld.getValues(listing, 'payee');
    var contractPayees = jsonld.getValues(contract, 'payee');
    payswarm.tools.appendPayees(payees, contractPayees);

    // create transfers
    payswarm.tools.createTransfers(
      contract, options.acquirerAccountId, payees);

    // assign date
    contract.created = payswarm.tools.w3cDate();

    // write finalized contract to cache so it can be retrieved by ID
    // later to be processed
    if(!('psaExpires' in contract)) {
      var secs = Math.ceil((+new Date()) / 1000);
      var expires = payswarm.config.financial.cachedContractExpiration;
      contract.psaExpires = secs + expires;
    }
    var now = +new Date();
    var record = {
      id: payswarm.db.hash(contract.id),
      expires: Date.parse(contract.psaExpires),
      meta: {
        created: now,
        updated: now
      },
      contract: contract
    };
    payswarm.db.collections.contractCache.insert(
      record, payswarm.db.writeOptions, function(err) {
        callback(err, contract);
      });
  });
};

/**
 * Ensures that the Payee amounts in the given Contract meet the minimums
 * specified in the given PayeeScheme.
 *
 * This should be called after finalizing the Contract (which is when
 * Transfers will be generated). This method will be automatically called
 * if the "createFinalizedContract" API is used.
 *
 * @param contract the Contract to check.
 * @param psId the ID of the PayeeScheme to check.
 * @param callback(err) called once the operation completes.
 */
api.checkPayeeAmounts = function(contract, psId, callback) {
  // check payee scheme existence
  if(!(psId in payswarm.config.financial.payeeSchemes)) {
    return callback(new PaySwarmError(
      'PayeeScheme not found.',
      MODULE_TYPE + '.PayeeSchemeNotFound'));
  }

  // check minimum amounts on payee scheme
  var ps = payswarm.config.financial.payeeSchemes[psId];
  if('psaMinimumAmounts' in ps) {
    var amountMap = ps.psaMinimumAmounts;
    var payees = jsonld.getValues(ps, 'payee');
    var transfers = jsonld.getValues(contract, 'transfer');
    for(var i in payees) {
      var payee = payees[i];
      var dst = payee.destination;
      if(dst in amountMap) {
        // FIXME: should this total amounts to the destination account and
        // check that instead?

        // find a transfer that matches the minimum amount
        var found = false;
        var min = new Money(amountMap[dst]);
        for(var ti in transfers) {
          var transfer = transfers[ti];
          if(dst === transfer.destination) {
            var amount = new Money(transfer.amount);
            if(amount.compareTo(min) >= 0) {
              found = true;
              break;
            }
          }
        }

        if(!found) {
          return callback(new PaySwarmError(
            'The minimum monetary amount to cover the Transaction for a ' +
            'particular FinancialAccount has not been met.',
            MODULE_TYPE + '.InsufficientMonetaryAmount', {
              minimum: min.toString(),
              account: dst
            }));
        }
      }
    }
  }

  callback();
};

/**
 * A helper-method that:
 *
 * 1. Creates a Contract.
 * 2. Adds the default PaySwarm Authority PayeeScheme to it.
 * 3. Finalizes the Contract.
 * 4. Checks the Payee amounts on the finalized Contract.
 *
 * @see createContract
 *
 * @param actor the Profile performing the action.
 * @param options:
 *          referenceId: a reference ID to use.
 *          listingId: the Listing ID (to look up Listing).
 *          listing: the full Listing (to use given Listing).
 *          listingHash: the Listing hash.
 *          asset: the Asset (optional, will be retrieved otherwise).
 *          license: the License (optional, will be retrieved otherwise).
 *          acquirer: the Asset acquirer to use.
 *          acquirerAccountId: the Asset acquirer's Account ID.
 * @param callback(err, contract) called once the operation completes.
 */
api.createFinalizedContract = function(actor, options, callback) {
  // get the default PaySwarm Authority PayeeScheme ID
  var psId = api.createPayeeSchemeId(payswarm.config.authority.id, 'default');

  async.waterfall([
    // 1. Create the Contract.
    function(callback) {
      api.createContract(actor, options, callback);
    },
    // 2. Add the PaySwarm Authority PayeeScheme.
    function(contract, callback) {
      api.addPayeeSchemeToContract(
        contract, psId, {maximizeAmount: true, ownerType: 'ps:Authority'},
        callback);
    },
    // 3. Finalize the Contract.
    function(contract, callback) {
      api.finalizeContract(actor, contract, options, callback);
    },
    // 4. Check the Payee amounts.
    function(contract, callback) {
      api.checkPayeeAmounts(contract, psId, function(err) {
        callback(err, contract);
      });
    }
  ], callback);
};

/**
 * Processes a signed Contract. License issuance, financial Transactions,
 * and any other business is handled. This method must only be called
 * after finalizeContract().
 *
 * The options include:
 *
 * A "duplicateQuery" that can be used prevent duplicate purchases
 * from occurring. The query is used to determine if the Contract would
 * result in a duplicate purchase and should therefore cause the Transaction
 * to abort. See hasContract for details on "duplicateQuery".
 *
 * @param actor the Profile performing the action.
 * @param contract the Contract to process.
 * @param options:
 *          duplicateQuery a query used to prevent duplicates.
 * @param callback(err) called once the operation completes.
 */
api.processContract = function(actor, contract, options, callback) {
  // FIXME: check permissions, include address check on identity (only
  // once an identity has an address should it have permission to process
  // a contract, but it should be able to finalize one?)

  // Note: This method assumes the contract has been finalized.

  // attempt to authorize contract
  payswarm.financial.authorizeTransaction(
    contract, options.duplicateQuery, callback);
};

/**
 * Retrieves a Contract by its ID.
 *
 * @param actor the Profile performing the action.
 * @param id the ID of the Contract to retrieve.
 * @param callback(err, contract, meta) called once the operation completes.
 */
api.getContract = function(actor, id, callback) {
  // FIXME: populate listing, asset, and license info
  // FIXME: (optimize contract storage by not storing what is in
  // resource collections)
  payswarm.financial.getTransaction(actor, id, callback);
};

/**
 * Retrieves a previously-cached Contract by its ID. When Contracts are
 * finalized, they are written to a temporary cache so that they can
 * be retrieved later for processing.
 *
 * @param actor the profile Performing the action.
 * @param id the ID of the Contract to retrieve.
 * @param callback(err, contract) called once the operation completes.
 */
api.getCachedContract = function(actor, id, callback) {
  payswarm.db.collections.contractCache.findOne(
    {id: payswarm.db.hash(id)}, {contract: true}, function(err, record) {
      if(err) {
        return callback(err);
      }
      if(!record) {
        return callback(new PaySwarmError(
          'Contract not found.',
          MODULE_TYPE + '.ContractNotFound', {id: id}));
      }
      var contract = record.contract;
      delete contract.psaExpires;
      callback(null, contract);
    });
};

/**
 * Signs a contract.
 *
 * @param actor the Profile performing the action.
 * @param contract the Contract to sign.
 * @param callback(err) called once the operation completes.
 */
api.signContract = function(actor, contract, callback) {
  return next(new PaySwarmError(
    'Not implemented.',
    MODULE_TYPE + '.NotImplemented'));
};

/**
 * Verifies a contract.
 *
 * @param contract the Contract to verify.
 * @param callback(err, verified) called once the operation completes.
 */
api.verifyContract = function(contract, callback) {
  return next(new PaySwarmError(
    'Not implemented.',
    MODULE_TYPE + '.NotImplemented'));
};

/**
 * Checks to see if a Contract exists for the given query.
 *
 * @param actor the Profile performing the action.
 * @param query the query to use.
 * @param callback(err, exists) called once the operation completes.
 */
api.hasContract = function(actor, query, callback) {
  payswarm.financial.getTransactions(
    actor, query, {_id: true}, {limit: 1}, function(err, records) {
      if(err) {
        return callback(err);
      }
      callback(null, records.length !== 0);
    });
};
