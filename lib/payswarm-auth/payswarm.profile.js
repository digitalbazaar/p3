/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var payswarm = {
  config: require('../payswarm.config'),
  db: require('./payswarm.database'),
  events: require('./payswarm.events'),
  logger: require('./payswarm.loggers').get('app'),
  permission: require('./payswarm.permission'),
  security: require('./payswarm.security'),
  tools: require('./payswarm.tools')
};
var PaySwarmError = payswarm.tools.PaySwarmError;

// constants
var MODULE_TYPE = 'payswarm.profile';
var MODULE_IRI = 'https://payswarm.com/modules/profile';

// module permissions
var PERMISSIONS = {
  PROFILE_ADMIN: MODULE_IRI + '#profile_admin',
  PROFILE_ACCESS: MODULE_IRI + '#profile_access',
  PROFILE_CREATE: MODULE_IRI + '#profile_create',
  PROFILE_EDIT: MODULE_IRI + '#profile_edit',
  PROFILE_REMOVE: MODULE_IRI + '#profile_remove'
};

// module API
var api = {};
api.name = MODULE_TYPE + '.Profile';
module.exports = api;

/**
 * Initializes this module.
 *
 * @param app the application to initialize this module for.
 * @param callback(err) called once the operation completes.
 */
api.init = function(app, callback) {
  // do initialization work
  async.waterfall([
    function(callback) {
      // open all necessary collections
      payswarm.db.openCollections(['profile'], callback);
    },
    function(callback) {
      // setup collections (create indexes, etc)
      payswarm.db.createIndexes([{
        collection: 'profile',
        fields: {id: 1},
        options: {unique: true, background: true}
      }, {
        collection: 'profile',
        fields: {'profile.email': 1},
        options: {unique: false, background: true}
      }], callback);
    },
    _registerPermissions,
    function(callback) {
      // create profiles, ignoring duplicate errors
      async.forEachSeries(
        payswarm.config.profile.profiles,
        function(p, callback) {
          _createProfile(p, function(err) {
            if(err && payswarm.db.isDuplicateError(err)) {
              err = null;
            }
            callback(err);
          });
        }, callback);
    }
  ], callback);
};

/**
 * Creates a Profile ID from the given profilename (slug).
 *
 * @param name the profilename (slug).
 *
 * @return the Profile ID for the Profile.
 */
api.createProfileId = function(name) {
  return util.format('%s/profiles/%s',
    payswarm.config.authority.baseUri,
    encodeURIComponent(name));
};

/**
 * Gets the Profile ID(s) that match the given email address.
 *
 * @param email the email address.
 * @param callback(err, profileIds) called once the operation completes.
 */
api.resolveEmail = function(email, callback) {
  payswarm.db.collections.profile.find(
    {'profile.email': email},
    {'profile.id': true}).toArray(function(err, records) {
    if(records) {
      records.forEach(function(record, i) {
        records[i] = record.profile.id;
      });
    }
    callback(err, records);
  });
};

/**
 * Gets the Profile ID that matches the given profilename (slug). The Profile
 * ID will be null if none is found. If a full profile ID is passed, it will
 * be passed back in the callback if it is valid.
 *
 * @param name the profilename (slug).
 * @param callback(err, profileId) called once the operation completes.
 */
api.resolveProfilename = function(name, callback) {
  payswarm.db.collections.profile.findOne(
    {$or: [{id: payswarm.db.hash(name)}, {'profile.psaSlug': name}]},
    {'profile.id': true},
    function(err, result) {
      if(!err && result) {
        result = result.profile.id;
      }
      callback(err, result);
    });
};

/**
 * Gets the Profile IDs that match the given identifier. The identifier
 * can be a full ID, a profilename (slug) or email address.
 *
 * @param identifier the identifier to resolve.
 * @param callback(err, profileIds) called once the operation completes.
 */
api.resolveProfileIdentifier = function(identifier, callback) {
  // looks like an email
  if(identifier.indexOf('@') !== -1) {
    api.resolveEmail(identifier, callback);
  }
  // must be a profilename
  else {
    api.resolveProfilename(identifier, function(err, result) {
      if(err) {
        return callback(err);
      }
      if(result) {
        // arrayify result
        return callback(null, [result]);
      }
      // no matching profile found
      callback(null, []);
    });
  }
};

/**
 * Creates a new Profile.
 *
 * The Profile must contain id, a profilename (slug), and an email address.
 *
 * The Profile may contain a password and a set of Roles.
 *
 * @param actor the Profile performing the action.
 * @param profile the Profile containing at least the minimum required data.
 * @param callback(err, record) called once the operation completes.
 */
api.createProfile = function(actor, profile, callback) {
  async.waterfall([
    function(callback) {
      api.checkActorPermission(
        actor, PERMISSIONS.PROFILE_ADMIN, PERMISSIONS.PROFILE_CREATE, callback);
    },
    function(callback) {
      _createProfile(profile, callback);
    }
  ], callback);
};

/**
 * Retrieves all Profiles matching the given query.
 *
 * @param actor the Profile performing the action.
 * @param [query] the optional query to use (default: {}).
 * @param [fields] optional fields to include or exclude (default: {}).
 * @param callback(err, records) called once the operation completes.
 */
api.getProfiles = function(actor, query, fields, callback) {
  // handle args
  if(typeof query === 'function') {
    callback = query;
    query = null;
    fields = null;
  }
  else if(typeof fields === 'function') {
    callback = fields;
    fields = null;
  }

  query = query || {};
  fields = fields || {};
  async.waterfall([
    function(callback) {
      api.checkActorPermission(
        actor, PERMISSIONS.PROFILE_ADMIN, callback);
    },
    function(callback) {
      payswarm.db.collections.profile.find(query, fields).toArray(callback);
    }
  ], callback);
};

/**
 * Retrieves a Profile by its ID.
 *
 * @param actor the Profile performing the action.
 * @param id the ID of the Profile to retrieve.
 * @param callback(err, profile, meta) called once the operation completes.
 */
api.getProfile = function(actor, id, callback) {
  async.waterfall([
    function(callback) {
      api.checkActorPermissionForObject(
        actor, {id: id},
        PERMISSIONS.PROFILE_ADMIN, PERMISSIONS.PROFILE_ACCESS, callback);
    },
    function(callback) {
      payswarm.db.collections.profile.findOne(
        {id: payswarm.db.hash(id)}, {}, callback);
    },
    function(record, callback) {
      if(!record) {
        return callback(new PaySwarmError(
          'Profile not found.',
          MODULE_TYPE + '.ProfileNotFound',
          {id: id}));
      }
      // remove restricted fields
      delete record.profile.psaPassword;
      delete record.profile.psaPasscode;
      callback(null, record.profile, record.meta);
    },
  ], callback);
};

/**
 * Updates a Profile. Only specific information contained in the passed
 * Profile will be updated. Restricted fields can not be updated in this
 * call, and may have their own API calls.
 *
 * @param actor the Profile performing the action.
 * @param profile the Profile to update.
 * @param callback(err) called once the operation completes.
 */
api.updateProfile = function(actor, profile, callback) {
  async.waterfall([
    function(callback) {
      api.checkActorPermissionForObject(
        actor, profile,
        PERMISSIONS.PROFILE_ADMIN, PERMISSIONS.PROFILE_EDIT, callback);
    },
    function(callback) {
      // remove restricted fields
      profile = payswarm.tools.clone(profile);
      delete profile.psaSlug;
      delete profile.psaPassword;
      delete profile.psaPasswordNew;
      delete profile.psaPasscode;
      delete profile.psaRole;
      delete profile.psaStatus;
      payswarm.db.collections.profile.update(
        {id: payswarm.db.hash(profile.id)},
        {$set: payswarm.db.buildUpdate(profile, 'profile')},
        payswarm.db.writeOptions,
        callback);
    },
    function(n, info, callback) {
      if(n === 0) {
        callback(new PaySwarmError(
          'Could not update Profile. Profile not found.',
          MODULE_TYPE + '.ProfileNotFound'));
      }
      else {
        callback();
      }
    }
  ], callback);
};

/**
 * Sets a Profile's status.
 *
 * @param actor the Profile performing the action.
 * @param id the Profile ID.
 * @param status the status.
 * @param callback(err) called once the operation completes.
 */
api.setProfileStatus = function(actor, id, status, callback) {
  async.waterfall([
   function(callback) {
     api.checkActorPermissionForObject(
       actor, {id: id},
       PERMISSIONS.PROFILE_ADMIN, PERMISSIONS.PROFILE_EDIT, callback);
   },
   function(callback) {
     payswarm.db.collections.profile.update(
       {id: payswarm.db.hash(id)},
       {$set: {'profile.psaStatus': status}},
       payswarm.db.writeOptions,
       callback);
   },
   function(n, info, callback) {
     if(n === 0) {
       callback(new PaySwarmError(
         'Could not set Profile status. Profile not found.',
         MODULE_TYPE + '.ProfileNotFound'));
     }
     else {
       callback();
     }
   }
 ], callback);
};

/**
 * Sets a Profile's password. This method can optionally check an old password
 * or passcode and will always generate a new passcode and set it as
 * 'psaPasscode'. A new password doesn't have to be set using this method, it
 * can be called to simply generate a new passcode. If 'psaPassword' is
 * provided, it must be the old password and it will be checked. The same
 * applies to 'psaPasscode'. If a new password is to be set, it should be
 * passed as 'psaPasswordNew'.
 *
 * @param actor the Profile performing the action.
 * @param profile the Profile.
 * @param callback(err, changes) called once the operation completes.
 */
api.setProfilePassword = function(actor, profile, callback) {
  async.waterfall([
    function(callback) {
      api.checkActorPermissionForObject(
        actor, profile,
        PERMISSIONS.PROFILE_ADMIN, PERMISSIONS.PROFILE_EDIT, callback);
    },
    function(callback) {
      _updateProfilePassword(profile, callback);
    },
    function(changes, callback) {
      payswarm.db.collections.profile.update(
        {id: payswarm.db.hash(profile.id)},
        {$set: payswarm.db.buildUpdate(changes, 'profile')},
        payswarm.db.writeOptions,
        function(err, n) {
          callback(err, n, changes);
        });
    },
    function(n, changes, callback) {
      if(n === 0) {
        return callback(new PaySwarmError(
          'Could not set Profile password. Profile not found.',
          MODULE_TYPE + '.ProfileNotFound'));
      }
      callback(null, changes);
    }
  ], callback);
};

/**
 * A helper function for updating Profile passwords and passcodes. The
 * profile will be updated with a new passcode.
 *
 * @see setProfilePassword
 *
 * @param profile the profile.
 * @param callback(err, changes) called once the operation completes.
 */
function _updateProfilePassword(profile, callback) {
  var changes = {};
  async.auto({
    checkPassword: function(callback) {
      if('psaPassword' in profile) {
        api.verifyProfilePassword(profile, callback);
      }
      else {
        callback(null, null);
      }
    },
    checkPasscode: function(callback) {
      if('psaPasscode' in profile) {
        api.verifyProfilePasscode(profile, callback);
      }
      else {
        callback(null, null);
      }
    },
    hashPassword: ['checkPassword', 'checkPasscode',
      function(callback, results) {
        if(results.checkPassword === false) {
          return callback(new PaySwarmError(
            'Could not update profile password; invalid password.',
            MODULE_TYPE + '.InvalidPassword'));
        }
        if(results.checkPasscode === false) {
          return callback(new PaySwarmError(
            'Could not update profile passcode; invalid passcode.',
            MODULE_TYPE + '.InvalidPasscode'));
        }

        if('psaPasswordNew' in profile) {
          payswarm.security.createSaltedHash(
            profile.psaPasswordNew, null, callback);
        }
        else {
          callback();
        }
    }],
    generatePasscode: ['hashPassword', function(callback, results) {
      if(results.hashPassword) {
        changes.psaPassword = results.hashPassword;
      }
      var passcode = profile.psaPasscode = _generatePasscode();
      payswarm.security.createSaltedHash(passcode, null, callback);
    }]
  }, function(err, results) {
    if(!err) {
      changes.psaPasscode = results.generatePasscode;
    }
    callback(err, changes);
  });
}

/**
 * Verifies the Profile's password against the stored password.
 *
 * @param profile the Profile with the password to verify.
 * @param callback(err, verified) called once the operation completes.
 */
api.verifyProfilePassword = function(profile, callback) {
  _verifyProfileSaltedHash(profile, 'password', callback);
};

/**
 * Verifies the Profile's passcode against the stored passcode.
 *
 * @param profile the Profile with the passcode to verify.
 * @param callback(err, verified) called once the operation completes.
 */
api.verifyProfilePasscode = function(profile, callback) {
  _verifyProfileSaltedHash(profile, 'passcode', callback);
};

/**
 * A helper function for verifying passwords and passcodes.
 *
 * @param profile the profile with the password or passcode.
 * @param type 'password' or 'passcode'.
 * @param callback(err, verified) called once the operation completes.
 */
function _verifyProfileSaltedHash(profile, type, callback) {
  var field = 'psa' + type[0].toUpperCase() + type.substr(1);
  async.waterfall([
    function(callback) {
      // get status and <type> from db
      var fields = {'profile.psaStatus': true};
      fields['profile.' + field] = true;
      payswarm.db.collections.profile.findOne(
        {id: payswarm.db.hash(profile.id)}, fields, callback);
    },
    function(record, callback) {
      if(!record) {
        return callback(new PaySwarmError(
          'Could not verify Profile ' + type + '. Profile not found.',
          MODULE_TYPE + '.ProfileNotFound'));
      }
      if(record.profile.psaStatus !== 'active') {
        return callback(new PaySwarmError(
          'Could not verify Profile ' + type + '. Profile is not active.',
          MODULE_TYPE + '.ProfileInactive'));
      }
      callback(null, record.profile[field]);
    },
    function(hash, callback) {
      payswarm.security.verifySaltedHash(
        hash, profile[field], callback);
    }
  ], callback);
};

/**
 * Sends a Profile or multiple Profile's passcodes to their contact point
 * (eg: email address). The Profiles must all have the same contact point and
 * must be populated.
 *
 * @param profiles the Profiles to send the passcode to.
 * @param usage 'reset' if the passcode is for resetting a password,
 *          'verify' if it is for verifying an email address/contact point.
 * @param callback(err) called once the operation completes.
 */
api.sendProfilePasscodes = function(profiles, usage, callback) {
  // FIXME: require actor and check permissions to send email/sms/etc?

  // create event
  var event = {
    type: 'payswarm.common.Profile.passcodeSent',
    details: {
      usage: usage,
      profiles: [],
      email: null
    }
  };

  // lazy-load identity module
  if(!payswarm.identity) {
    payswarm.identity = require('./payswarm.identity');
  }

  // generate passcodes for every profile
  async.forEach(profiles, function(profile, callback) {
    // remove password and passcode from profile; this prevents checking
    // passwords/passcodes and only generates a new passcode
    profile = payswarm.tools.clone(profile);
    delete profile.psaPassword;
    delete profile.psaPasscode;
    api.setProfilePassword(null, profile, function(err, changes) {
      if(err) {
        return callback(err);
      }
      // get default profile identity
      payswarm.identity.getProfileDefaultIdentity(null, profile.id,
        function(err, identity) {
          // ignore identity not found errors for empty profiles
          if(err && err.name === 'payswarm.identity..IdentityNotFound') {
            err = null;
            identity = null;
          }
          if(err) {
            return callback(err);
          }
          profile.identity = identity;
          event.details.profiles.push(profile);
          if(!event.details.email) {
            event.details.email = profile.email;
          }
          else if(event.details.email !== profile.email) {
            return callback(new PaySwarmError(
              'Could not send Profile passcodes. The profiles do not all ' +
              'have the same contact point (eg: email address).',
              MODULE_TYPE + '.ContactPointMismatch'));
          }
          callback();
      });
    });
  }, function(err) {
    if(err) {
      return callback(err);
    }

    // emit passcode sent event
    payswarm.events.emit(event.type, event);
    // TODO: limit # emails sent per profile per day
    callback();
  });
};

/**
 * Sets the Profile's Roles from the profile['psaRole'] array of RoleIDs.
 *
 * @param actor the Profile performing the action.
 * @param profile the Profile that is being updated.
 * @param callback(err) called once the operation completes.
 */
api.setProfileRoles = function(actor, profile, callback) {
  async.waterfall([
    function(callback) {
      api.checkActorPermission(
        actor, PERMISSIONS.PROFILE_ADMIN, PERMISSIONS.PROFILE_CREATE, callback);
    },
    function(callback) {
      payswarm.db.collections.profile.update(
        {id: payswarm.db.hash(profile.id)},
        {$set: {'profile.psaRole': profile.psaRole}},
        payswarm.db.writeOptions,
        callback);
    }
  ], callback);
};

/**
 * Checks if the actor's Roles contain the necessary Permissions.
 *
 * The populated Roles will be cached in the Actor to make further
 * permission checks quicker.
 *
 * @param actor the Profile to check.
 * @param permissions the PermissionList to check.
 * @param callback(err) called once the operation completes.
 *
 * @return true if the actor has permission, false otherwise.
 */
api.checkActorPermissionList = function(actor, permissions, callback) {
  // if actor is null, ignore permission check
  if(actor === null) {
    return callback(null);
  }

  // use permission cache
  if('psaPermissionCache' in actor) {
    return payswarm.permission.checkPermission(
      actor.psaPermissionCache, permissions, callback);
  }

  // build permission cache
  async.waterfall([
    function(callback) {
      payswarm.db.collections.profile.findOne(
        {id: payswarm.db.hash(actor.id)},
        {'profile.psaRole': true},
        function(err, result) {
          if(err) {
            return callback(err);
          }
          if(!result) {
            result = [];
          }
          else {
            result = result.profile.psaRole;
          }
          _populateRoles(result, callback);
        });
    },
    function(records, callback) {
      // create map of unique permissions
      var unique = {};
      records.forEach(function(record) {
        record.role.psaPermission.forEach(function(permission) {
          unique[permission.id] = permission;
        });
      });

      // put unique permissions into cache
      actor.psaPermissionCache = [];
      for(var id in unique) {
        actor.psaPermissionCache.push(unique[id]);
      }
      callback();
    }
  ], function(err) {
    if(err) {
      return callback(err);
    }
    api.checkActorPermissionList(actor, permissions, callback);
  });
};

/**
 * A helper function for populating roles.
 *
 * @param roleIds the IDs of the roles to be populated.
 * @param callback(err, roles) called once the roles are populated.
 */
function _populateRoles(roleIds, callback) {
  var query = {id: {$in:[]}};
  roleIds.forEach(function(roleId) {
    query.id.$in.push(payswarm.db.hash(roleId));
  });
  payswarm.permission.getRoles(query, callback);
}

/**
 * Checks if the actor's Roles contain the necessary Permissions.
 *
 * The populated Roles will be cached in the Actor to make further
 * permission checks quicker.
 *
 * This function can check an arbitrary list of permission ids.
 *
 * @param actor the Profile to check.
 * @param permission1 a permission id to check.
 * @param permissionN a permission id to check (optional).
 * @param callback(err) called once the operation completes.
 */
api.checkActorPermission = function(actor, permission1) {
  var permissions = [];
  var length = arguments.length;
  for(var i = 1; i < length - 1; ++i) {
    permissions.push({id: arguments[i]});
  }
  var callback = arguments[length - 1];
  api.checkActorPermissionList(actor, permissions, callback);
};

/**
 * Checks if the actor owns the given object.
 *
 * The populated Roles will be cached in the Actor to make further
 * permission checks quicker.
 *
 * @param actor the Profile to check.
 * @param object the object used to check ownership.
 * @param comparator(actor, object, callback(err, owns)) a function to
 *          determine if the actor owns the object, omit for simple "id"
 *          comparison.
 * @param callback(err) called once the operation completes.
 */
api.checkActorOwnsObject = function(actor, object) {
  var length = arguments.length;
  var comparator;
  var callback;
  if(length === 3) {
    comparator = function(actor, object, callback) {
      callback(null, actor.id === object.id);
    };
    callback = arguments[2];
  }
  else {
    comparator = arguments[2];
    callback = arguments[3];
  }
  comparator(actor, object, function(err, owns) {
    if(!err && !owns) {
      err = new PaySwarmError(
        'The actor does not have permission to interact with this object.',
        'payswarm.permission.PermissionDenied');
    }
    callback(err);
  });
};

/**
 * Checks if the actor's Roles contain the necessary Permissions.
 *
 * The populated Roles will be cached in the Actor to make further
 * permission checks quicker.
 *
 * This function handles the common case of checking that an actor has a
 * normal permission and either also has a special permission or is the
 * owner of the target object.
 *
 * @param actor the Profile to check.
 * @param object the object used to check ownership.
 * @param permissionSpecial a special permission id to check.
 * @param permissionNormal a regular permission id to check.
 * @param comparator(actor, object, callback(err, owns)) a function to
 *          determine if the actor owns the object, omit for simple "id"
 *          comparison.
 * @param callback(err) called once the operation completes.
 */
api.checkActorPermissionForObject = function(
  actor, object, permissionSpecial, permissionNormal) {
  var length = arguments.length;
  var comparator;
  var callback;
  if(length === 6) {
    comparator = arguments[4];
    callback = arguments[5];
  }
  else {
    comparator = null;
    callback = arguments[4];
  }

  // if actor is null, ignore permission check
  if(actor === null) {
    return callback(null);
  }

  async.waterfall([
    function(callback) {
      api.checkActorPermission(actor, permissionNormal, callback);
    },
    function(callback) {
      api.checkActorPermission(actor, permissionSpecial, function(err) {
        // if special permission not granted, check object ownership
        if(err) {
          if(comparator) {
            api.checkActorOwnsObject(actor, object, comparator, callback);
          }
          else {
            api.checkActorOwnsObject(actor, object, callback);
          }
        }
        else {
          callback();
        }
      });
    }
  ], callback);
};

// static passcode character set
var CHARSET = (
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz');

/**
 * Generates a passcode for resetting a password. This passcode must be
 * stored using a salted hash in the database.
 *
 * @return the generated passcode.
 */
function _generatePasscode() {
  // passcodes are 8 chars long
  var rval = '';
  for(var i = 0; i < 8; ++i) {
    rval += CHARSET.charAt(parseInt(Math.random() * (CHARSET.length - 1)));
  }
  return rval;
}

/**
 * Creates a new profile, inserting it into the database. If the given profile
 * has no 'id' or 'psaSlug' property or either of those properties is not
 * truthy, then a unique slug and ID will be autogenerated for the profile
 * before inserting it.
 *
 * @param profile the profile to create.
 * @param callback(err, record) called once the operation completes.
 */
function _createProfile(profile, callback) {
  payswarm.logger.debug('creating profile', profile);

  var defaults = payswarm.config.profile.defaults.profile;
  payswarm.tools.extend(profile, {
    label: profile.label || profile.psaSlug || null,
    psaStatus: profile.psaStatus || defaults.psaStatus,
    psaRole: profile.psaRole || defaults.psaRole
  });

  /* Note: If the profile doesn't have a password, generate a fake one
  for them (that will not be known by anyone). This simplifies the code path
  for verifying passwords. */
  if(!('psaPassword' in profile)) {
    profile.psaPassword = _generatePasscode();
  }

  // generate new random passcode for profile
  var passcode = _generatePasscode();

  async.auto({
    hashPassword: function(callback) {
      if(profile.psaHashedPassword === true) {
        // password already hashed
        delete profile.psaHashedPassword;
        callback(null, profile.psaPassword);
      }
      else {
        payswarm.security.createSaltedHash(
          profile.psaPassword, null, callback);
      }
    },
    hashPasscode: function(callback) {
      if(profile.psaHashedPasscode === true) {
        // passcode already hashed
        delete profile.psaHashedPasscode;
        callback(null, profile.psaPasscode);
      }
      else {
        payswarm.security.createSaltedHash(passcode, null, callback);
      }
    }
  }, function(err, results) {
    if(err) {
      return callback(err);
    }

    // store hash results
    profile.psaPassword = results.hashPassword;
    profile.psaPasscode = results.hashPasscode;

    // keep attempting to insert profile until a generated ID is unique or
    // an ID was given
    var result = null;
    var generateId = !(profile.id && profile.psaSlug);
    var setLabel = !profile.label;
    async.until(function() {return result !== null;}, function(callback) {
      // generate a new unique slug and ID using UUID
      if(generateId) {
        profile.psaSlug = payswarm.tools.uuid();
        profile.id = api.createProfileId(profile.psaSlug);
      }

      // default label to profile slug
      if(setLabel) {
        profile.label = profile.psaSlug;
      }

      // insert the profile
      var now = +new Date();
      var record = {
        id: payswarm.db.hash(profile.id),
        meta: {
          created: now,
          updated: now
        },
        profile: profile
      };
      payswarm.db.collections.profile.insert(
        record, payswarm.db.writeOptions, function(err, records) {
          if(err) {
            // try again if generating ID and ID was a duplicate
            if(generateId && payswarm.db.isDuplicateError(err)) {
              return callback();
            }
            // return error
            return callback(err);
          }
          // return unhashed passcode, set result
          profile.psaPasscode = passcode;
          result = records[0];
          callback();
        });
    }, function(err) {
      if(err) {
        return callback(err);
      }
      callback(null, result);
    });
  });
}

/**
 * Registers the permissions for this module.
 *
 * @param callback(err) called once the operation completes.
 */
function _registerPermissions(callback) {
  var permissions = [{
    id: PERMISSIONS.PROFILE_ADMIN,
    psaModule: MODULE_IRI,
    label: 'Profile Administration',
    comment: 'Required to administer Profiles.'
  }, {
    id: PERMISSIONS.PROFILE_ACCESS,
    psaModule: MODULE_IRI,
    label: 'Access Profile',
    comment: 'Required to access a Profile.'
  }, {
    id: PERMISSIONS.PROFILE_CREATE,
    psaModule: MODULE_IRI,
    label: 'Create Profile',
    comment: 'Required to create a Profile.'
  }, {
    id: PERMISSIONS.PROFILE_EDIT,
    psaModule: MODULE_IRI,
    label: 'Edit Profile',
    comment: 'Required to edit a Profile.'
  }, {
    id: PERMISSIONS.PROFILE_REMOVE,
    psaModule: MODULE_IRI,
    label: 'Remove Profile',
    comment: 'Required to remove a Profile.'
  }];
  async.forEach(permissions, function(p, callback) {
    payswarm.permission.registerPermission(p, callback);
  }, callback);
}
