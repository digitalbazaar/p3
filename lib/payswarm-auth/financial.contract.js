/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var bedrock = require('bedrock');
var brDatabase = require('bedrock-mongodb');
var brIdentity = require('bedrock-identity');
var jsonld = require('./jsonld'); // use locally-configured jsonld
var util = require('util');
var payswarm = {
  asset: require('./resource'),
  constants: bedrock.config.constants,
  financial: require('./financial'),
  logger: bedrock.loggers.get('app'),
  money: require('./money'),
  resource: require('./resource'),
  security: require('./security'),
  tools: require('./tools')
};
var BedrockError = bedrock.util.BedrockError;
var Money = payswarm.money.Money;

// constants
var MODULE_NS = payswarm.financial.namespace;

// module permissions
var PERMISSIONS = bedrock.config.permission.permissions;

// sub module API
var api = {};
module.exports = api;

bedrock.events.on('bedrock-mongodb.ready', function(callback) {
  async.waterfall([
    function(callback) {
      // open all necessary collections
      brDatabase.openCollections(['contractCache'], callback);
    },
    function(callback) {
      // setup collections (create indexes, etc)
      brDatabase.createIndexes([{
        // ID
        collection: 'contractCache',
        fields: {id: 1},
        options: {unique: true, background: true}
      }], callback);
    },
    function(callback) {
      // FIXME: add listener for cleanup cached contract events
      callback();
    }
  ], callback);
});

/**
 * Creates and populates a new Contract. The Asset acquirer will not be set
 * on the contract until it is finalized. If any Payees are added to the
 * contract, they must be checked to ensure they don't use reserved group
 * prefixes like "authority" or "payswarm".
 *
 * If a Listing ID is provided, the Listing will be retrieved, otherwise
 * a the full Listing must be provided. An asset and license may be provided,
 * otherwise they will be retrieved. Providing these options optimize away
 * retrievals.
 *
 * @param actor the Identity performing the action.
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
  async.auto({
    checkPermission: function(callback) {
      brIdentity.checkPermission(
        actor, PERMISSIONS.TRANSACTION_CREATE, {resource: actor}, callback);
    },
    getListing: ['checkPermission', function(callback) {
      if(options.listing) {
        return payswarm.resource.listing.validate(
          options.listing, function(err) {
            callback(err, options.listing);
          });
      }
      // populate listing
      var query = {
        id: options.listingId,
        hash: options.listingHash,
        type: 'Listing',
        strict: true,
        fetch: true,
        validate: true
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
    }],
    checkListing: ['getListing', function(callback, results) {
      var payees = jsonld.getValues(results.getListing, 'payee');
      payswarm.tools.checkPayeeGroups(payees, callback);
    }],
    getAsset: ['checkListing', function(callback, results) {
      if(options.asset) {
        return payswarm.resource.asset.validate(
          options.asset, function(err) {
            callback(err, options.asset);
          });
      }
      // populate asset
      var listing = results.getListing;
      var query = {
        id: listing.asset,
        hash: listing.assetHash,
        type: 'Asset',
        strict: true,
        fetch: true,
        validate: true
      };
      payswarm.resource.asset.get(query, function(err, records) {
        if(err) {
          return callback(err);
        }
        var asset = records[0].resource;
        callback(null, asset);
      });
    }],
    checkAsset: ['getAsset', function(callback, results) {
      var payees = jsonld.getValues(results.getAsset, 'payee');
      payswarm.tools.checkPayeeGroups(payees, callback);
    }],
    getLicense: ['checkListing', function(callback, results) {
      if(options.license) {
        return payswarm.resource.license.validate(
          options.license, function(err) {
            callback(err, options.license);
          });
      }
      // populate license
      var listing = results.getListing;
      var query = {
        id: listing.license,
        hash: listing.licenseHash,
        type: 'License',
        strict: true,
        fetch: true,
        validate: true
      };
      payswarm.resource.license.get(query, function(err, records) {
        if(err) {
          return callback(err);
        }
        var license = records[0].resource;
        callback(null, license);
      });
    }],
    getAssetProvider: ['checkAsset', function(callback, results) {
      var asset = results.getAsset;
      var id = bedrock.util.clone(asset.assetProvider);
      if(bedrock.util.isObject(id)) {
        id = id.id;
      }
      brIdentity.getIdentity(null, id, function(err, identity) {
        if(err) {
          return callback(new BedrockError(
            'The Asset provider\'s information was not found at the ' +
            'provided PaySwarm Authority.',
            MODULE_NS + '.AssetProviderNotFound', {
              'public': true,
              authority: bedrock.config.authority.id,
              assetProvider: id
            }, err));
        }
        // add basic public asset provider information
        // FIXME: should check and/or enforce these are allowed in sysPublic
        var assetProvider = {
          id: identity.id,
          type: identity.type,
          label: identity.label
        };
        if('url' in identity) {
          assetProvider.url = identity.url;
        }
        if('description' in identity) {
          assetProvider.description = identity.description;
        }
        callback(null, assetProvider);
      });
    }],
    getVendor: ['getAssetProvider', function(callback, results) {
      var assetProvider = results.getAssetProvider;

      // get vendor (optimize via simply clone if asset provider is vendor)
      var id = results.getListing.vendor;
      if(bedrock.util.isObject(id)) {
        id = id.id;
      }
      if(id === assetProvider.id) {
        return callback(null, bedrock.util.clone(assetProvider));
      }

      brIdentity.getIdentity(null, id, function(err, identity) {
        if(err) {
          return callback(new BedrockError(
            'The vendor\'s information was not found at the ' +
            'provided PaySwarm Authority.',
            MODULE_NS + '.VendorNotFound', {
              'public': true,
              authority: bedrock.config.authority.id,
              vendor: id
            }, err));
        }
        // add basic public vendor information
        // FIXME: should check and/or enforce these are allowed in sysPublic
        var vendor = {
          id: identity.id,
          type: identity.type,
          label: identity.label
        };
        if('url' in identity) {
          vendor.url = identity.url;
        }
        if('description' in identity) {
          vendor.description = identity.description;
        }
        // Note: add vendor address later
        callback(null, vendor);
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
    // remove duplicate context links
    delete results.getListing['@context'];
    delete results.getAsset['@context'];
    delete results.getLicense['@context'];

    var contract = {
      type: ['Transaction', 'Contract'],
      created: bedrock.util.w3cDate(),
      listing: results.getListing,
      listingHash: options.listingHash,
      asset: results.getAsset,
      license: results.getLicense,
      assetProvider: results.getAssetProvider,
      vendor: results.getVendor
    };
    if('referenceId' in options) {
      contract.referenceId = options.referenceId;
    }
    callback(null, contract);
  });
};

/**
 * Attempts to add a Payee to a Contract. If the Payee is valid and the
 * Contract's Asset and Listing Payee Rules permit the Payee to be added, it
 * will be. If not, an error will be raised.
 *
 * This must be called before finalizing the Contract.
 *
 * @param contract the Contract to add a Payee to.
 * @param payee the Payee to add.
 * @param options:
 *          maximizeRate: true to try to maximize the Payee's rate based on
 *            the given Payee Rules, false not to (default: false).
 * @param callback(err) called once the operation completes.
 */
api.addPayeeToContract = function(contract, payee, options, callback) {
  // get payee rules for both asset and listing
  var assetRules = [];
  var restrictions = jsonld.getValues(contract.asset, 'listingRestrictions');
  if(restrictions.length > 0) {
    assetRules = jsonld.getValues(restrictions[0], 'payeeRule');
  }
  var listingRules = jsonld.getValues(contract.listing, 'payeeRule');

  // if there are no listing payee rules, default behavior is prohibit
  // adding payees
  if(listingRules.length === 0) {
    return callback(new BedrockError(
      'Could not add Payee to Contract. The Listing has no Payee rules, ' +
      'which indicates that no Payees may be added to the Contract.',
      MODULE_NS + '.NoPayeeRules'));
  }

  // attempt to maximize rate if requested
  var max = new Money(payee.payeeRate);

  var pass = false;

  // if there are no asset payee rules, default behavior is to allow
  // any payees
  if(assetRules.length === 0) {
    pass = true;
  } else {
    // ensure that the given payee meets at least one asset payee rule
    for(var i = 0; i < assetRules.length; ++i) {
      var rule = assetRules[i];

      // if a limitation of no additional payees is detected, disallow
      // adding the payee
      if('payeeLimitation' in rule) {
        if(rule.payeeLimitation === 'NoAdditionalPayeesLimitation') {
          pass = false;
          break;
        }
        // no other limitations are supported, and if found, automatically
        // deny adding any other payees
        pass = false;
        break;
      }

      if(payswarm.tools.checkPayeeRule(rule, payee)) {
        pass = true;

        // update maximum rate
        if('maximumPayeeRate' in rule) {
          var tmp = new Money(rule.maximumPayeeRate);
          if(tmp.compareTo(max) > 0) {
            max = tmp;
          }
        }
      }
    }
  }

  if(!pass) {
    return callback(new BedrockError(
      'Could not add Payee to Contract. The Asset has no Payee rule ' +
      'that permits the necessary Payees to be added to the Contract.',
      MODULE_NS + '.ProhibitedByPayeeRules', {'public': true}));
  }

  // ensure that the given payee meets at least one listing payee rule
  pass = false;
  for(var i = 0; i < listingRules.length; ++i) {
    var rule = listingRules[i];

    // if a limitation of no additional payees is detected, disallow
    // adding the payee
    if('payeeLimitation' in rule) {
      if(rule.payeeLimitation === 'NoAdditionalPayeesLimitation') {
        pass = false;
        break;
      }
      // no other limitations are supported, and if found, automatically
      // deny adding any other payees
      pass = false;
      break;
    }

    if(payswarm.tools.checkPayeeRule(rule, payee)) {
      pass = true;

      // update maximum rate
      if('maximumPayeeRate' in rule) {
        var tmp = new Money(rule.maximumPayeeRate);
        if(tmp.compareTo(max) > 0) {
          max = tmp;
        }
      }
    }
  }

  if(!pass) {
    return callback(new BedrockError(
      'Could not add Payee to Contract. The Listing has no Payee rule ' +
      'that permits the necessary Payees to be added to the Contract.',
      MODULE_NS + '.ProhibitedByPayeeRules', {'public': true}));
  }

  // update rate to maximum rules allow if requested
  if(options.maximizeRate) {
    payee.payeeRate = max.toString();
  }

  // payee passes a payee rule, add it
  jsonld.addValue(contract, 'payee', payee);
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
 * @param callback(err, contract) called once the operation completes.
 */
api.addPayeeSchemeToContract = function(contract, psId, options, callback) {
  // check payee scheme existence
  if(!(psId in bedrock.config.financial.payeeSchemes)) {
    return callback(new BedrockError(
      'PayeeScheme not found.',
      MODULE_NS + '.PayeeSchemeNotFound'));
  }

  var ps = bedrock.config.financial.payeeSchemes[psId];
  payswarm.logger.debug('add payee scheme to contract', ps);

  // add each payee
  var payees = jsonld.getValues(ps, 'payee');
  async.forEachSeries(payees, function(payee, callback) {
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
 * If, in order to process the contract using the given account, an
 * 'instant transfer' is required, a prepared deposit will be stored
 * under the 'triggered' property of the contract.
 *
 * After the call returns successfully, the Contract will be the
 * "Asset acquirer's version" and it should not be given to the Asset
 * provider because it will contain identity information.
 *
 * @param actor the Identity performing the action.
 * @param contract the Contract to finalize.
 * @param options:
 *          acquirer: the Asset acquirer to use.
 *          acquirerAccountId: the Asset acquirer's Account ID.
 *          [cache]: true to cache the contract for later retrieval
 *            (default: false).
 * @param callback(err, contract) called once the operation completes.
 */
api.finalizeContract = function(actor, contract, options, callback) {
  // normalize acquirer to an object
  var acquirer = options.acquirer;
  if(typeof options.acquirer === 'string') {
    acquirer = {id: acquirer};
  }

  async.auto({
    checkPermission: function(callback) {
      brIdentity.checkPermission(
        actor, PERMISSIONS.TRANSACTION_CREATE, {resource: actor}, callback);
    },
    checkValidity: ['checkPermission', function(callback) {
      var assetValidity = payswarm.tools.checkPurchaseValidity(contract.asset);
      if(assetValidity !== 0) {
        if(assetValidity < 0) {
          return callback(new BedrockError(
            'The time during which the Asset could be purchased has expired.',
            MODULE_NS + '.AssetExpired', {'public': true}));
        } else {
          return callback(new BedrockError(
            'The time during which the Asset can be purchased has not yet ' +
            'begun.',
            MODULE_NS + '.AssetValidInFuture', {'public': true}));
        }
      }
      var listingValidity = payswarm.tools.checkPurchaseValidity(
        contract.listing);
      if(listingValidity !== 0) {
        if(listingValidity < 0) {
          return callback(new BedrockError(
            'The time during which the Listing could be purchased has expired.',
            MODULE_NS + '.ListingExpired', {'public': true}));
        } else {
          return callback(new BedrockError(
            'The time during which the Listing can be purchased has not yet ' +
            'begun.',
            MODULE_NS + '.ListingValidInFuture', {'public': true}));
        }
      }
      callback();
    }],
    getAcquirer: ['checkValidity', function(callback) {
      // populate asset acquirer if identity address not present
      if('address' in acquirer) {
        return callback(null, bedrock.util.clone(acquirer));
      }
      brIdentity.getIdentity(
        actor, acquirer.id, function(err, identity) {
          callback(err, identity);
        });
    }],
    checkSourceAccount: ['checkValidity', function(callback) {
      // ensure asset acquirer owns the source financial account
      payswarm.financial.getAccount(
        actor, options.acquirerAccountId, function(err, account) {
          if(err) {
            return callback(err);
          }
          if(acquirer.id !== account.owner) {
            return callback(new BedrockError(
              'The Asset acquirer does not own the source FinancialAccount.',
              MODULE_NS + '.InvalidSourceAccount', {'public': true}));
          }
          callback(null, account);
        });
    }],
    generateId: ['checkValidity', function(callback) {
      payswarm.financial.generateTransactionId(callback);
    }],
    createTransfers: ['generateId', 'checkSourceAccount',
      function(callback, results) {
      contract.id = results.generateId;
      var sourceId = results.checkSourceAccount.id;

      // FIXME: set currency elsewhere?
      contract.currency = results.checkSourceAccount.currency;

      // combine asset, listing, and contract payees
      var assetPayees = [];
      var restrictions = jsonld.getValues(
        contract.asset, 'listingRestrictions');
      if(restrictions.length > 0) {
        assetPayees = jsonld.getValues(restrictions[0], 'payee');
      }
      var listingPayees = jsonld.getValues(contract.listing, 'payee');
      var contractPayees = jsonld.getValues(contract, 'payee');
      var payees = assetPayees.concat(listingPayees).concat(contractPayees);

      // create transfers
      payswarm.tools.createTransfers(contract, sourceId, payees, callback);
    }],
    checkFunding: ['createTransfers', function(callback) {
      payswarm.financial.checkFunding(contract, callback);
    }],
    createInstantTransfer: ['checkFunding', function(callback, results) {
      // no need to/can't create instant transfer deposit, skip
      if(!results.checkFunding.insufficientFunds ||
        !results.checkFunding.canInstantTransfer) {
        return callback();
      }

      payswarm.financial.createInstantTransferDeposit(
        contract, function(err, deposit) {
          if(err) {
            return callback(err);
          }
          contract.triggered = deposit;
          callback();
      });
    }]
  }, function(err, results) {
    if(err) {
      return callback(err);
    }

    // ensure address is set
    if(results.getAcquirer.address.length === 0) {
      return callback(new BedrockError(
        'The Asset acquirer does not have a primary address set.',
        MODULE_NS + '.AddressNotFound', {'public': true}));
    }

    // Note: Asset and Listing are assumed valid and correctly signed.

    contract.assetAcquirer = {
      id: results.getAcquirer.id,
      address: results.getAcquirer.address[0]
    };

    // assign date
    contract.created = bedrock.util.w3cDate();

    // do not cache contract unless requested
    if(!options.cache) {
      return callback(err, contract);
    }

    // write finalized contract to cache so it can be retrieved by ID
    // later to be processed
    if(!('sysExpires' in contract)) {
      var secs = Math.ceil((+new Date()) / 1000);
      var expires = bedrock.config.financial.cachedContract.expiration;
      contract.sysExpires = secs + expires;
    }
    var now = +new Date();
    var record = {
      id: brDatabase.hash(contract.id),
      expires: new Date(contract.sysExpires),
      meta: {
        created: now,
        updated: now
      },
      contract: bedrock.util.extend(
        brDatabase.encode(contract),
        {'@context': payswarm.constants.PAYSWARM_CONTEXT_V1_URL})
    };
    brDatabase.collections.contractCache.insert(
      record, brDatabase.writeOptions, function(err) {
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
  if(!(psId in bedrock.config.financial.payeeSchemes)) {
    return callback(new BedrockError(
      'PayeeScheme not found.',
      MODULE_NS + '.PayeeSchemeNotFound'));
  }

  // check minimum amounts on payee scheme
  var ps = bedrock.config.financial.payeeSchemes[psId];
  if('sysMinimumAmounts' in ps) {
    var amountMap = ps.sysMinimumAmounts;
    var payees = jsonld.getValues(ps, 'payee');
    var transfers = jsonld.getValues(contract, 'transfer');
    for(var i in payees) {
      var payee = payees[i];
      var dst = payee.destination;
      var total = new Money(0);
      if(dst in amountMap) {
        // total amounts to destination
        transfers.forEach(function(xfer) {
          if(dst === xfer.destination) {
            total = total.add(xfer.amount);
          }
        });

        if(total.compareTo(amountMap[dst]) < 0) {
          return callback(new BedrockError(
            'The minimum monetary amount to cover the Transaction for a ' +
            'particular FinancialAccount has not been met.',
            MODULE_NS + '.InsufficientMonetaryAmount', {
              minimum: amountMap[dst].toString(),
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
 * @param actor the Identity performing the action.
 * @param options:
 *          referenceId: a reference ID to use.
 *          listingId: the Listing ID (to look up Listing).
 *          listing: the full Listing (to use given Listing).
 *          listingHash: the Listing hash.
 *          asset: the Asset (optional, will be retrieved otherwise).
 *          license: the License (optional, will be retrieved otherwise).
 *          acquirer: the Asset acquirer to use.
 *          acquirerAccountId: the Asset acquirer's Account ID.
 *          [cache]: true to cache the contract for later retrieval
 *            (default: false).
 * @param callback(err, contract) called once the operation completes.
 */
api.createFinalizedContract = function(actor, options, callback) {
  // get the default PaySwarm Authority PayeeScheme ID
  var psId = api.createPayeeSchemeId(bedrock.config.authority.id, 'default');

  async.waterfall([
    // 1. Create the Contract.
    function(callback) {
      api.createContract(actor, options, callback);
    },
    // 2. Add the PaySwarm Authority PayeeScheme.
    function(contract, callback) {
      api.addPayeeSchemeToContract(
        contract, psId, {maximizeAmount: true}, callback);
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
 * to abort. The query will be run directly against the transaction collection.
 *
 * @param actor the Identity performing the action.
 * @param contract the Contract to process.
 * @param options:
 *          duplicateQuery a query used to prevent duplicates.
 * @param callback(err) called once the operation completes.
 */
api.processContract = function(actor, contract, options, callback) {
  // Note: This method assumes the contract has been finalized.

  async.auto({
    checkPermission: function(callback) {
      brIdentity.checkPermission(
        actor, PERMISSIONS.TRANSACTION_CREATE, {resource: actor}, callback);
    },
    getVendor: ['checkPermission', function(callback) {
      brIdentity.getIdentity(
        null, contract.vendor.id, function(err, identity) {
          if(err) {
            return callback(new BedrockError(
              'The vendor\'s information was not found at the ' +
              'provided PaySwarm Authority.',
              MODULE_NS + '.VendorNotFound', {
                'public': true,
                authority: bedrock.config.authority.id,
                vendor: contract.vendor.id
              }, err));
          }
          callback(null, identity);
        });
    }],
    addVendorAddress: ['getVendor', function(callback, results) {
      var identity = results.getVendor;
      if(!('address' in identity) || identity.address.length === 0) {
        return callback(new BedrockError(
          'The vendor does not have a primary address set.',
          MODULE_NS + '.AddressNotFound', {'public': true}));
      }
      contract.vendor.address = identity.address[0];
      callback();
    }],
    authorize: ['addVendorAddress', function(callback) {
      // attempt to authorize contract
      payswarm.financial.authorizeTransaction(
        contract, options, function(err) {
          // clear vendor address to hide from buyer
          delete contract.vendor.address;
          callback(err);
        });
    }],
    removeCached: ['checkPermission', function(callback) {
      // FIXME: emit event to handle this -- reuse code that expires
      // contracts in the cache
      brDatabase.collections.contractCache.remove(
        {id: brDatabase.hash(contract.id)}, function(err) {
          if(err) {
            payswarm.logger.warning(
              'An error occurred while trying to remove cached contract.',
              err);
          }
          callback();
        });
    }]
  }, callback);
};

/**
 * Retrieves a Contract by its ID.
 *
 * @param actor the Identity performing the action.
 * @param id the ID of the Contract to retrieve.
 * @param callback(err, contract, meta) called once the operation completes.
 */
api.getContract = function(actor, id, callback) {
  payswarm.financial.getTransaction(actor, id, callback);
};

/**
 * Retrieves a previously-cached Contract by its ID. When Contracts are
 * finalized, they are written to a temporary cache so that they can
 * be retrieved later for processing. Contracts that use the 'instant transfer'
 * feature will have a prepared deposit stored under their 'triggered'
 * property.
 *
 * @param actor the Identity performing the action.
 * @param id the ID of the Contract to retrieve.
 * @param callback(err, contract) called once the operation completes.
 */
api.getCachedContract = function(actor, id, callback) {
  brDatabase.collections.contractCache.findOne(
    {id: brDatabase.hash(id)}, {contract: true}, function(err, record) {
      if(err) {
        return callback(err);
      }
      if(!record) {
        return callback(new BedrockError(
          'Contract not found.',
          MODULE_NS + '.ContractNotFound', {id: id}));
      }
      var contract = bedrock.util.extend(
        brDatabase.decode(record.contract),
        {'@context': payswarm.constants.PAYSWARM_CONTEXT_V1_URL});
      delete contract.sysExpires;
      callback(null, contract);
    });
};

/**
 * Signs a contract.
 *
 * @param actor the Identity performing the action.
 * @param contract the Contract to sign.
 * @param callback(err) called once the operation completes.
 */
api.signContract = function(actor, contract, callback) {
  return callback(new BedrockError(
    'Not implemented.',
    MODULE_NS + '.NotImplemented'));
};

/**
 * Verifies a contract.
 *
 * @param contract the Contract to verify.
 * @param callback(err, verified) called once the operation completes.
 */
api.verifyContract = function(contract, callback) {
  return callback(new BedrockError(
    'Not implemented.',
    MODULE_NS + '.NotImplemented'));
};

/**
 * Checks to see if a Contract exists for the given query.
 *
 * @param actor the Identity performing the action.
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
