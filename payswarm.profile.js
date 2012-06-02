/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var payswarm = {
  config: require('./payswarm.config'),
  db: require('./payswarm.database'),
  events: require('./payswarm.events'),
  logger: require('./payswarm.logger'),
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
        fields: {id: true},
        options: {unique: true, background: true}
      }, {
        collection: 'profile',
        fields: {'profile.foaf:mbox': true},
        options: {unique: false, background: true}
      }, {
        collection: 'profile',
        fields: {'profile.psa:slug': true},
        options: {unique: true, background: true}
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
    {'profile.foaf:mbox': email},
    {'profile.@id': true},
    payswarm.db.readOptions
  ).toArray(function(err, result) {
    if(result) {
      for(var i in result) {
        result[i] = result[i].profile['@id'];
      }
    }
    callback(err, result);
  });
};

/**
 * Gets the Profile ID that matches the given profilename (slug). The Profile ID
 * will be null if none is found.
 *
 * @param name the profilename (slug).
 * @param callback(err, profileId) called once the operation completes.
 */
api.resolveProfilename = function(name, callback) {
  payswarm.db.collections.profile.findOne(
    {'profile.psa:slug': name},
    {'profile.@id': true},
    payswarm.db.readOptions,
    function(err, result) {
      if(!err && result) {
        result = result.profile['@id'];
      }
      callback(err, result);
    });
};

/**
 * Gets the Profile IDs that match the given identifier. The identifier
 * can be a profilename (slug) or email address.
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
 * The Profile must contain @id, a profilename (slug), and an email address.
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
      payswarm.db.collections.profile.find(
        query, fields, payswarm.db.readOptions).toArray(callback);
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
        actor, {'@id': id},
        PERMISSIONS.PROFILE_ADMIN, PERMISSIONS.PROFILE_ACCESS, callback);
    },
    function(callback) {
      payswarm.db.collections.profile.findOne(
        {id: payswarm.db.hash(id)}, payswarm.db.readOptions, callback);
    },
    function(result, callback) {
      if(!result) {
        return callback(new PaySwarmError(
          'Profile not found.',
          MODULE_TYPE + '.ProfileNotFound',
          {'@id': id}));
      }
      // remove restricted fields
      delete result.profile['psa:password'];
      delete result.profile['psa:passcode'];
      callback(null, result.profile, result.meta);
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
      delete profile['psa:slug'];
      delete profile['psa:password'];
      delete profile['psa:passwordNew'];
      delete profile['psa:passcode'];
      delete profile['psa:role'];
      delete profile['psa:status'];
      payswarm.db.collections.profile.update(
        {id: payswarm.db.hash(profile['@id'])},
        {$set: payswarm.db.buildUpdate(profile)},
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
       actor, {'@id': id},
       PERMISSIONS.PROFILE_ADMIN, PERMISSIONS.PROFILE_EDIT, callback);
   },
   function(callback) {
     payswarm.db.collections.profile.update(
       {id: payswarm.db.hash(id)},
       {$set: {'profile.psa:status': status}},
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
 * 'psa:passcode'. A new password doesn't have to be set using this method, it
 * can be called to simply generate a new passcode. If 'psa:password' is
 * provided, it must be the old password and it will be checked. The same
 * applies to 'psa:passcode'. If a new password is to be set, it should be
 * passed as 'psa:passwordNew'.
 *
 * @param actor the Profile performing the action.
 * @param profile the Profile.
 * @param callback(err) called once the operation completes.
 *
 * @return true if successful, false on failure with Exception set.
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
        {id: payswarm.db.hash(id)},
        {$set: payswarm.db.buildUpdate(changes)},
        payswarm.db.writeOptions,
        callback);
    },
    function(n, info, callback) {
      if(n === 0) {
        callback(new PaySwarmError(
          'Could not set Profile password. Profile not found.',
          MODULE_TYPE + '.ProfileNotFound'));
      }
      else {
        callback();
      }
    }
  ], callback);
};

/**
 * A helper function for updating Profile passwords and passcodes.
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
      if('psa:password' in profile) {
        verifyProfilePassword(profile, callback);
      }
      else {
        callback();
      }
    },
    checkPasscode: function(callback) {
      if('psa:passcode' in profile) {
        verifyProfilePasscode(profile, callback);
      }
      else {
        callback();
      }
    },
    hashPassword: ['checkPassword', 'checkPasscode', function(callback) {
      if('psa:passwordNew' in profile) {
        payswarm.security.createSaltedHash(
          profile['psa:passwordNew'], null, callback);
      }
      else {
        callback();
      }
    }],
    generatePasscode: ['hashPassword', function(callback, results) {
      if(results.hashPassword) {
        changes['psa:password'] = results.hashPassword;
      }
      var passcode = profile['psa:passcode'] = _generatePasscode();
      payswarm.security.createSaltedHash(passcode, null, callback);
    }]
  }, function(err, results) {
    if(!err) {
      changes['psa:passcode'] = results.generatePasscode;
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
  async.waterfall([
    function(callback) {
      // get status and <type> from db
      var fields = {'profile.psa:status': true};
      fields['profile.psa:' + type] = true;
      payswarm.db.collections.profile.findOne(
        {id: payswarm.db.hash(profile['@id'])},
        fields, payswarm.db.readOptions, callback);
    },
    function(result, callback) {
      if(!result) {
        return callback(new PaySwarmError(
          'Could not verify Profile ' + type + '. Profile not found.',
          MODULE_TYPE + '.ProfileNotFound'));
      }
      if(result.profile['psa:status'] !== 'active') {
        return callback(new PaySwarmError(
          'Could not verify Profile ' + type + '. Profile is not active.',
          MODULE_TYPE + '.ProfileInactive'));
      }
      callback(null, result.profile['psa:' + type]);
    },
    function(hash, callback) {
      payswarm.security.verifySaltedHash(
        hash, profile['psa:' + type], callback);
    }
  ], callback);
};

/**
 * Sends a Profile or multiple Profile's passcodes to their contact point
 * (eg: email address). The Profiles must all have the same contact point and
 * it must be set.
 *
 * @param profiles the Profiles to send the passcode to.
 * @param usage 'reset' if the passcode is for resetting a password,
 *          'verify' if it is for verifying an email address/contact point.
 *
 * @return true if successful, false on failure with Exception set.
 */
api.sendProfilePasscodes = function(profiles, usage) {
  // FIXME: require actor and check permissions to send email/sms/etc?

  // create event
  var event = {
    type: 'payswarm.common.Profile.passcodeSent',
    usage: usage,
    profiles: [],
    email: null
  };

  // generate passcodes for every profile
  async.forEach(profiles, function(profile, callback) {
    _updateProfilePassword(profile, function(err, changes) {
      event.profiles.push(profile);
      if(!event.email) {
        event.email = profile['foaf:mbox'];
      }
      else if(event.email !== profile['foaf:mbox']) {
        return callback(new PaySwarmError(
          'Could not send Profile passcodes. The profiles do not all ' +
          'have the same contact point (eg: email address).',
          MODULE_TYPE + '.ContactPointMismatch'));
      }
      callback();
    });
  }, function(err) {
    // emit passcode sent event
    payswarm.events.emit(event.type, event);

    // TODO: limit # emails sent per profile per day
  });
};

/**
 * Sets the Profile's Roles from the profile['psa:roles'] array of RoleIDs.
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
        {id: payswarm.db.hash(profile['@id'])},
        {$set: {'profile.psa:role': profile['psa:role']}},
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
  if('psa:permissionCache' in actor) {
    return payswarm.permission.checkPermission(
      actor['psa:permissionCache'], permissions, callback);
  }

  // build permission cache
  async.waterfall([
    function(callback) {
      payswarm.db.collections.profile.findOne(
        {id: payswarm.db.hash(actor['@id'])},
        {'profile.psa:role': true},
        payswarm.db.readOptions, function(err, result) {
          if(err) {
            return callback(err);
          }
          if(!result) {
            result = [];
          }
          else {
            result = result.profile['psa:role'];
          }
          _populateRoles(result, callback);
        });
    },
    function(records, callback) {
      // create map of unique permissions
      var unique = {};
      records.forEach(function(record) {
        record.role['psa:permission'].forEach(function(permission) {
          unique[permission['@id']] = permission;
        });
      });

      // put unique permissions into cache
      actor['psa:permissionCache'] = [];
      for(var id in unique) {
        actor['psa:permissionCache'].push(unique[id]);
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
    permissions.push({'@id': arguments[i]});
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
 *          determine if the actor owns the object, omit for simple "@id"
 *          comparison.
 * @param callback(err) called once the operation completes.
 */
api.checkActorOwnsObject = function(actor, object) {
  var length = arguments.length;
  var comparator;
  var callback;
  if(length === 3) {
    comparator = function(actor, object, callback) {
      callback(null, actor['@id'] === object['@id']);
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
 *          determine if the actor owns the object, omit for simple "@id"
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
    rval += CHARSET.charAt(Math.random() % CHARSET.length - 1);
  }
  return rval;
}

/**
 * Creates a new profile, inserting it into the database.
 *
 * @param profile the profile to create.
 * @param callback(err, record) called once the operation completes.
 */
function _createProfile(profile, callback) {
  payswarm.logger.debug('creating profile', profile);

  var defaults = payswarm.config.profile.defaults.profile;
  payswarm.tools.extend(profile, {
    'rdfs:label': profile['rdfs:label'] || profile['psa:slug'],
    'psa:status': profile['psa:status'] || defaults['psa:status'],
    'psa:role': profile['psa:role'] || defaults['psa:role']
  });

  /* Note: If the profile doesn't have a password, generate a fake one
  for them (that will not be known by anyone). This simplifies the code path
  for verifying passwords. */
  if(!('psa:password' in profile)) {
    profile['psa:password'] = _generatePasscode();
  }

  // generate new random passcode for profile
  var passcode = _generatePasscode();

  // hash password and passcode
  async.auto({
    hashPassword: function(callback) {
      if(profile['psa:hashedPassword'] === true) {
        // password already hashed
        delete profile['psa:hashedPassword'];
        callback(null, profile['psa:password']);
      }
      else {
        payswarm.security.createSaltedHash(
          profile['psa:password'], null, callback);
      }
    },
    hashPasscode: function(callback) {
      payswarm.security.createSaltedHash(
        profile['psa:passcode'], null, callback);
    }
  }, function(err, results) {
    if(err) {
      return callback(err);
    }

    // store hash results
    profile['psa:password'] = results.hashPassword;
    profile['psa:passcode'] = results.hashPasscode;

    // insert the profile
    var now = +new Date();
    var record = {
      id: payswarm.db.hash(profile['@id']),
      meta: {
        created: now,
        updated: now
      },
      profile: profile
    };
    payswarm.db.collections.profile.insert(
      record, payswarm.db.writeOptions, function(err, record) {
        // return unhashed passcode
        profile['psa:passcode'] = passcode;
        callback(err, record);
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
    '@id': PERMISSIONS.PROFILE_ADMIN,
    'psa:module': MODULE_IRI,
    'rdfs:label': 'Profile Administration',
    'rdfs:comment': 'Required to administer Profiles.'
  }, {
    '@id': PERMISSIONS.PROFILE_ACCESS,
    'psa:module': MODULE_IRI,
    'rdfs:label': 'Access Profile',
    'rdfs:comment': 'Required to access a Profile.'
  }, {
    '@id': PERMISSIONS.PROFILE_CREATE,
    'psa:module': MODULE_IRI,
    'rdfs:label': 'Create Profile',
    'rdfs:comment': 'Required to create a Profile.'
  }, {
    '@id': PERMISSIONS.PROFILE_EDIT,
    'psa:module': MODULE_IRI,
    'rdfs:label': 'Edit Profile',
    'rdfs:comment': 'Required to edit a Profile.'
  }, {
    '@id': PERMISSIONS.PROFILE_REMOVE,
    'psa:module': MODULE_IRI,
    'rdfs:label': 'Remove Profile',
    'rdfs:comment': 'Required to remove a Profile.'
  }];
  async.forEach(permissions, function(p, callback) {
    payswarm.permission.registerPermission(p, callback);
  }, callback);
}
