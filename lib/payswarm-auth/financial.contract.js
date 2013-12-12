/*
 * Copyright (c) 2012-2013 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var jsonld = require('./jsonld'); // use locally-configured jsonld
var util = require('util');
var payswarm = {
  asset: require('./resource'),
  config: require('../config'),
  db: require('./database'),
  financial: require('./financial'),
  identity: require('./identity'),
  logger: require('./loggers').get('app'),
  money: require('./money'),
  permission: require('./permission'),
  profile: require('./profile'),
  resource: require('./resource'),
  security: require('./security'),
  tools: require('./tools')
};
var PaySwarmError = payswarm.tools.PaySwarmError;
var Money = payswarm.money.Money;

// constants
var MODULE_TYPE = payswarm.financial.type;
var MODULE_IRI = payswarm.financial.iri;

// module permissions
var PERMISSIONS = payswarm.financial.PERMISSIONS;

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
        fields: {id: 1},
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
 * on the contract until it is finalized. If any Payees are added to the
 * contract, they must be checked to ensure they don't use reserved group
 * prefixes like "authority" or "payswarm".
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
  async.auto({
    checkPermission: function(callback) {
      payswarm.profile.checkActorPermissionOrSpecial(
        actor, PERMISSIONS.TRANSACTION_ADMIN, PERMISSIONS.TRANSACTION_CREATE,
        callback);
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
          type: identity.type,
          label: identity.label
        };
        if('website' in identity) {
          assetProvider.website = identity.website;
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
      if(payswarm.tools.isObject(id)) {
        id = id.id;
      }
      if(id === assetProvider.id) {
        return callback(null, payswarm.tools.clone(assetProvider));
      }

      payswarm.identity.getIdentity(null, id, function(err, identity) {
        if(err) {
          return callback(new PaySwarmError(
            'The vendor\'s information was not found at the ' +
            'provided PaySwarm Authority.',
            MODULE_TYPE + '.VendorNotFound', {
              'public': true,
              authority: payswarm.config.authority.id,
              vendor: id
            }, err));
        }
        // add basic public vendor information
        var vendor = {
          id: identity.id,
          type: identity.type,
          label: identity.label
        };
        if('website' in identity) {
          vendor.website = identity.website;
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
      created: payswarm.tools.w3cDate(),
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
    return callback(new PaySwarmError(
      'Could not add Payee to Contract. The Listing has no Payee rules, ' +
      'which indicates that no Payees may be added to the Contract.',
      MODULE_TYPE + '.NoPayeeRules'));
  }

  // attempt to maximize rate if requested
  var max = new Money(payee.payeeRate);

  var pass = false;

  // if there are no asset payee rules, default behavior is to allow
  // any payees
  if(assetRules.length === 0) {
    pass = true;
  }
  else {
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
    return callback(new PaySwarmError(
      'Could not add Payee to Contract. The Asset has no Payee rule ' +
      'that permits the necessary Payees to be added to the Contract.',
      MODULE_TYPE + '.ProhibitedByPayeeRules', {'public': true}));
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
    return callback(new PaySwarmError(
      'Could not add Payee to Contract. The Listing has no Payee rule ' +
      'that permits the necessary Payees to be added to the Contract.',
      MODULE_TYPE + '.ProhibitedByPayeeRules', {'public': true}));
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
 * @param actor the profile performing the action.
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
      payswarm.profile.checkActorPermissionOrSpecial(
        actor, PERMISSIONS.TRANSACTION_ADMIN, PERMISSIONS.TRANSACTION_CREATE,
        callback);
    },
    checkValidity: ['checkPermission', function(callback) {
      var assetValidity = payswarm.tools.checkPurchaseValidity(contract.asset);
      if(assetValidity !== 0) {
        if(assetValidity < 0) {
          return callback(new PaySwarmError(
            'The time during which the Asset could be purchased has expired.',
            MODULE_TYPE + '.AssetExpired', {'public': true}));
        }
        else {
          return callback(new PaySwarmError(
            'The time during which the Asset can be purchased has not yet ' +
            'begun.',
            MODULE_TYPE + '.AssetValidInFuture', {'public': true}));
        }
      }
      var listingValidity = payswarm.tools.checkPurchaseValidity(
        contract.listing);
      if(listingValidity !== 0) {
        if(listingValidity < 0) {
          return callback(new PaySwarmError(
            'The time during which the Listing could be purchased has expired.',
            MODULE_TYPE + '.ListingExpired', {'public': true}));
        }
        else {
          return callback(new PaySwarmError(
            'The time during which the Listing can be purchased has not yet ' +
            'begun.',
            MODULE_TYPE + '.ListingValidInFuture', {'public': true}));
        }
      }
      callback();
    }],
    getAcquirer: ['checkValidity', function(callback) {
      // populate asset acquirer if identity address not present
      if('address' in acquirer) {
        return callback(null, payswarm.tools.clone(acquirer));
      }
      payswarm.identity.getIdentity(
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
            return callback(new PaySwarmError(
              'The Asset acquirer does not own the source FinancialAccount.',
              MODULE_TYPE + '.InvalidSourceAccount', {'public': true}));
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
      return callback(new PaySwarmError(
        'The Asset acquirer does not have a primary address set.',
        MODULE_TYPE + '.AddressNotFound', {'public': true}));
    }

    // Note: Asset and Listing are assumed valid and correctly signed.

    contract.assetAcquirer = {
      id: results.getAcquirer.id,
      address: results.getAcquirer.address[0]
    };

    // assign date
    contract.created = payswarm.tools.w3cDate();

    // do not cache contract unless requested
    if(!options.cache) {
      return callback(err, contract);
    }

    // write finalized contract to cache so it can be retrieved by ID
    // later to be processed
    if(!('psaExpires' in contract)) {
      var secs = Math.ceil((+new Date()) / 1000);
      var expires = payswarm.config.financial.cachedContract.expiration;
      contract.psaExpires = secs + expires;
    }
    var now = +new Date();
    var record = {
      id: payswarm.db.hash(contract.id),
      expires: new Date(contract.psaExpires),
      meta: {
        created: now,
        updated: now
      },
      contract: payswarm.tools.extend(
        payswarm.db.encode(contract),
        {'@context': payswarm.tools.getDefaultJsonLdContextUrl()})
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
      var total = new Money(0);
      if(dst in amountMap) {
        // total amounts to destination
        transfers.forEach(function(xfer) {
          if(dst === xfer.destination) {
            total = total.add(xfer.amount);
          }
        });

        if(total.compareTo(amountMap[dst]) < 0) {
          return callback(new PaySwarmError(
            'The minimum monetary amount to cover the Transaction for a ' +
            'particular FinancialAccount has not been met.',
            MODULE_TYPE + '.InsufficientMonetaryAmount', {
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
 *          [cache]: true to cache the contract for later retrieval
 *            (default: false).
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
 * @param actor the Profile performing the action.
 * @param contract the Contract to process.
 * @param options:
 *          duplicateQuery a query used to prevent duplicates.
 * @param callback(err) called once the operation completes.
 */
api.processContract = function(actor, contract, options, callback) {
  // Note: This method assumes the contract has been finalized.

  async.auto({
    checkPermission: function(callback) {
      payswarm.profile.checkActorPermissionOrSpecial(
        actor, PERMISSIONS.TRANSACTION_ADMIN, PERMISSIONS.TRANSACTION_CREATE,
        callback);
    },
    getVendor: ['checkPermission', function(callback) {
      payswarm.identity.getIdentity(
        null, contract.vendor.id, function(err, identity) {
          if(err) {
            return callback(new PaySwarmError(
              'The vendor\'s information was not found at the ' +
              'provided PaySwarm Authority.',
              MODULE_TYPE + '.VendorNotFound', {
                'public': true,
                authority: payswarm.config.authority.id,
                vendor: contract.vendor.id
              }, err));
          }
          callback(null, identity);
        });
    }],
    addVendorAddress: ['getVendor', function(callback, results) {
      var identity = results.getVendor;
      if(!('address' in identity) || identity.address.length === 0) {
        return callback(new PaySwarmError(
          'The vendor does not have a primary address set.',
          MODULE_TYPE + '.AddressNotFound', {'public': true}));
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
      payswarm.db.collections.contractCache.remove(
        {id: payswarm.db.hash(contract.id)}, function(err) {
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
 * @param actor the Profile performing the action.
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
      var contract = payswarm.tools.extend(
        payswarm.db.decode(record.contract),
        {'@context': payswarm.tools.getDefaultJsonLdContext()});
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
