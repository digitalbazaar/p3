/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var bedrock = require('bedrock');
var payswarm = {
  config: bedrock.config,
  constants: bedrock.config.constants,
  db: bedrock.modules['bedrock.database'],
  identity: bedrock.modules['bedrock.identity'],
  logger: bedrock.loggers.get('app')
};
var BedrockError = bedrock.tools.BedrockError;

// constants
var MODULE_NS = 'payswarm.identityPreferences';

// module permissions
var PERMISSIONS = bedrock.config.permission.permissions;

// module API
var api = {};
api.name = MODULE_NS;
module.exports = api;

/**
 * Initializes this module.
 *
 * @param app the application to initialize this module for.
 * @param callback(err) called once the operation completes.
 */
api.init = function(app, callback) {
  callback();
};

/**
 * Sets an Identity's preferences.
 *
 * @param actor the Identity performing the action.
 * @param prefs the Identity's preferences, with "owner" set to the
 *          Identity.
 * @param callback(err) called once the operation completes.
 */
api.setIdentityPreferences = function(actor, prefs, callback) {
  async.waterfall([
    function(callback) {
      payswarm.identity.checkPermission(
        actor, PERMISSIONS.IDENTITY_EDIT,
        {resource: prefs, translate: 'owner'}, callback);
    },
    function(callback) {
      var update = payswarm.db.buildUpdate(
        prefs, 'identity.preferences', {
          include: [
            'identity.preferences',
            'identity.preferences.owner',
            'identity.preferences.destination',
            'identity.preferences.source',
            'identity.preferences.publicKey'
          ]
        });
      payswarm.db.collections.identity.update(
        {id: payswarm.db.hash(prefs.owner)},
        {$set: update},
        payswarm.db.writeOptions, callback);
    },
    function(n, info, callback) {
      if(n === 0) {
        callback(new BedrockError(
          'Could not update Identity preferences. Identity not found.',
          MODULE_NS + '.IdentityNotFound'));
      } else {
        callback();
      }
    }
  ], callback);
};

/**
 * Gets an Identity's preferences.
 *
 * @param actor the Identity performing the action.
 * @param prefs the Identity's preferences to populate, with "owner" set
 *          to the Identity.
 * @param callback(err, prefs) called once the operation completes.
 */
api.getIdentityPreferences = function(actor, prefs, callback) {
  async.waterfall([
    function(callback) {
      payswarm.identity.checkPermission(
        actor, PERMISSIONS.IDENTITY_ACCESS,
        {resource: prefs, translate: 'owner'}, callback);
    },
    function(callback) {
      payswarm.db.collections.identity.findOne(
        {id: payswarm.db.hash(prefs.owner)},
        {'identity.preferences': true}, callback);
    },
    function(record, callback) {
      if(!record) {
        return callback(null, null);
      }
      // ensure @context and owner are set
      var preferences = record.identity.preferences;
      preferences['@context'] = payswarm.constants.CONTEXT_URL;
      preferences.owner = prefs.owner;
      callback(null, preferences);
    }
  ], callback);
};
