/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var payswarm = {
  config: require('./payswarm.config'),
  db: require('./payswarm.database'),
  logger: require('./payswarm.logger'),
  tools: require('./payswarm.tools')
};
var PaySwarmError = payswarm.tools.PaySwarmError;

// constants
var MODULE_TYPE = 'payswarm.permission';
var MODULE_IRI = 'https://payswarm.com/modules/permission';

// module permissions
var PERMISSIONS = {
  ROLE_ADMIN: MODULE_IRI + '#role_admin',
  /*ROLE_CREATE: MODULE_IRI + '#role_create',*/
  ROLE_EDIT: MODULE_IRI + '#role_edit',
  ROLE_REMOVE: MODULE_IRI + '#role_remove'
};

// module API
var api = {};
api.name = MODULE_TYPE + '.Permission';
module.exports = api;

// cache of registered permissions
var registeredPermissions = {
  map: {},
  list: []
};

/**
 * Initializes this module.
 *
 * @param app the application to initialize this module for.
 * @param callback(err) called once the operation completes.
 */
api.init = function(app, callback) {
  // do initialization work
  async.waterfall([
    function openCollections(callback) {
      // open all necessary collections
      payswarm.db.openCollections(['role'], callback);
    },
    function setupCollections(callback) {
      // setup collections (create indexes, etc)
      payswarm.db.createIndexes([{
        collection: 'role',
        fields: {id: 1},
        options: {unique: true, background: true}
      }], callback);
    },
    _registerPermissions,
    function addRoles(callback) {
      // add roles, ignoring duplicate errors
      async.forEachSeries(
        payswarm.config.permission.roles,
        function(r, callback) {
          api.addRole(r, function(err) {
            if(err && payswarm.db.isDuplicateError(err)) {
              err = null;
            }
            callback(err);
          });
        },
        callback);
    }
  ], callback);
};

/**
 * Registers the Permission with the system so it can be added to Roles.
 *
 * @param permission the Permission to register.
 * @param callback(err) called once the operation completes.
 */
api.registerPermission = function(permission, callback) {
  async.waterfall([
    function(callback) {
      // validate permission
      //payswarm.validation.permission.isValid(permission, callback);
      callback();
    },
    function(callback) {
      var list = registeredPermissions.list;
      var map = registeredPermissions.map;
      var id = permission['@id'];
      if(id in map) {
        // update permission
        list[map[id]] = permission;
      }
      else {
        // add new permission
        map[id] = list.length;
        list.push(permission);
      }
    }
  ], callback);
};

/**
 * Retrieves all Permissions currently registered in the system.
 *
 * @return a clone of the list of Permissions registered in the system.
 */
api.getRegisteredPermissions = function() {
  return payswarm.tools.clone(registeredPermissions.list);
};

/**
 * Creates a Role ID from the given Role name.
 *
 * @param name the name of the Role.
 *
 * @return the Role ID generated for the Role.
 */
api.createRoleId = function(name) {
  return util.format('%s/roles/%s',
    payswarm.config.authority.baseUri,
    encodeURIComponent(name));
};

/**
 * Adds a new Role to the system.
 *
 * @param role the Role to add.
 * @param callback(err) called once the operation completes.
 */
api.addRole = function(role, callback) {
  // FIXME: anyone can create a Role, is this correct? (no actor)

  // insert the role
  var now = +new Date();
  var record = {
    id: payswarm.db.hash(role['@id']),
    meta: {
      created: now,
      updated: now
    },
    role: role
  };
  payswarm.db.collections.role.insert(
    record, payswarm.db.writeOptions, callback);
};

/**
 * Retrieves all Roles matching the given query.
 *
 * @param query the query to use (defaults to {}).
 * @param callback(err, records) called once the operation completes.
 */
api.getRoles = function(query, callback) {
  query = query || {};
  async.waterfall([
    function(callback) {
      payswarm.db.collections.role.find(
        query, payswarm.db.readOptions).toArray(callback);
    }
  ], callback);
};

/**
 * Retrieves a single Role.
 *
 * @param id the ID of the Role to retrieve.
 * @param callback(err, role, meta) called once the operation completes.
 */
api.getRole = function(id, callback) {
  async.waterfall([
    function(callback) {
      payswarm.db.collections.findOne(
        {id: payswarm.db.hash(id)},
        payswarm.db.readOptions,
        callback);
    },
    function(result, callback) {
      callback(null, result.role, result.meta);
    }
  ], callback);
};

/**
 * Updates a Role. Sets the label, comment, and permissions for the role.
 *
 * @param actor the Profile performing the action.
 * @param role the Role to update.
 * @param callback(err) called once the operation completes.
 */
api.updateRole = function(actor, role, callback) {
  async.waterfall([
    function(callback) {
      api.checkActorPermission(
        actor, PERMISSIONS.ROLE_ADMIN, PERMISSIONS.ROLE_EDIT, callback);
    },
    function(callback) {
      payswarm.db.collections.role.update(
        {id: payswarm.db.hash(role['@id'])},
        {$set: payswarm.db.buildUpdate(role)},
        payswarm.db.writeOptions,
        callback);
    },
    function(n, callback) {
      if(n === 0) {
        callback(new PaySwarmError(
          'Could not update Role. Role not found.',
          MODULE_TYPE + '.RoleNotFound'));
      }
      else {
        callback();
      }
    }
  ], callback);
};

/**
 * Removes a Role from the system.
 *
 * Warning: This may leave data that depends on Roles that do not exist.
 *
 * @param actor the Profile performing the action.
 * @param id the ID of the Role to remove.
 * @param callback(err) called once the operation completes.
 */
api.removeRole = function(actor, id, callback) {
  async.waterfall([
    function(callback) {
      api.checkActorPermission(
        actor, PERMISSIONS.ROLE_ADMIN, PERMISSIONS.ROLE_REMOVE, callback);
    },
    function(callback) {
      payswarm.db.collections.profile.remove(
        {id: payswarm.db.hash(id)},
        payswarm.db.writeOptions,
        callback);
    }
  ], callback);
};

/**
 * Checks if the first PermissionList has a superset of the permissions in
 * second PermissionList.
 *
 * @param superset the PermissionList to check against.
 * @param subset the PermissionList of permissions to check.
 * @param callback(err) called once the operation completes.
 */
api.checkPermission = function(superset, subset, callback) {
  async.waterfall([
    function(callback) {
      // FIXME: validate superset
      //payswarm.validation.permissionList.isValid(superset, callback);
      callback();
    },
    function(callback) {
      // FIXME: validate subset
      //payswarm.validation.permissionList.isValid(subset, callback);
      callback();
    },
    function(callback) {
      // build superset map
      var map;
      superset.forEach(function(permission) {
        map[permission['@id']] = permission;
      });

      // create denied permission list
      var denied = [];

      // check subset against superset
      subset.forEach(function(permission) {
        if(!(permission['@id'] in map)) {
          denied.push(payswarm.tools.clone(permission));
        }
      });

      var err = null;
      if(denied.length > 0) {
        err = new PaySwarmError(
          'Permission denied.',
          MODULE_TYPE + '.PermissionDenied',
          {denied: denied});
      }
      callback(err);
    }
  ], callback);
};

/**
 * Checks if the Role has all of the permissions.
 *
 * @param role the Role to check.
 * @param permissions the PermissionList of permissions to check.
 * @param callback(err) called once the operation completes.
 */
api.checkRolePermission = function(role, permissions, callback) {
  async.waterfall([
    function(callback) {
      // FIXME: validate role
      //payswarm.validation.role.isValid(role, callback);
      callback();
    },
    function(callback) {
      // FIXME: validate list
      //payswarm.validation.permissionList.isValid(permissions, callback);
      callback();
    },
    function(callback) {
      api.checkPermission(role['psa:permission'], permissions, callback);
    }
  ], callback);
};

/**
 * Registers the permissions for this module.
 *
 * @param callback(err) called once the operation completes.
 */
function _registerPermissions(callback) {
  var permissions = [{
    '@id': PERMISSIONS.ROLE_ADMIN,
    'psa:module': MODULE_IRI,
    'rdfs:label': 'Role Administration',
    'rdfs:comment': 'Required to administer Roles.'
  }, {
    '@id': PERMISSIONS.ROLE_ACCESS,
    'psa:module': MODULE_IRI,
    'rdfs:label': 'Access Role',
    'rdfs:comment': 'Required to access a Role.'
  }, {
    '@id': PERMISSIONS.ROLE_CREATE,
    'psa:module': MODULE_IRI,
    'rdfs:label': 'Create Role',
    'rdfs:comment': 'Required to create a Role.'
  }, {
    '@id': PERMISSIONS.ROLE_EDIT,
    'psa:module': MODULE_IRI,
    'rdfs:label': 'Edit Role',
    'rdfs:comment': 'Required to edit a Role.'
  }, {
    '@id': PERMISSIONS.ROLE_REMOVE,
    'psa:module': MODULE_IRI,
    'rdfs:label': 'Remove Role',
    'rdfs:comment': 'Required to remove a Role.'
  }];
  async.forEach(permissions, function(p, callback) {
    api.registerPermission(p, callback);
  }, callback);
}
