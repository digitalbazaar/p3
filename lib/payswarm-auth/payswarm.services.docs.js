/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var i18n = require('i18n');
var payswarm = {
    config: require('../payswarm.config'),
    docs: require('./payswarm.docs'),
    logger: require('./payswarm.loggers').get('app'),
    profile: require('./payswarm.profile'),
    validation: require('./payswarm.validation'),
    website: require('./payswarm.website')
};

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
  // do initialization work
  async.waterfall([
    function(callback) {
      addServices(app, callback);
    }
  ], callback);
};

/**
 * Adds web services to the server.
 *
 * @param app the payswarm-auth application.
 * @param callback(err) called once the services have been added to the server.
 */
function addServices(app, callback) {
  app.server.get('/docs', function(req, res, next) {
    async.waterfall([
      function(callback) {
        payswarm.website.getDefaultViewVars(req, function(err, vars) {
          if(err) {
            return callback(err);
          }

          // build the documentation object for the template
          var docs = {};
          var categories = payswarm.docs.categories;
          for(var c in categories) {
            var category = categories[c];
            docs[category] = {};
          };
          var verbs = payswarm.docs.getAnnotations();
          for(var method in verbs) {
            var annotations = verbs[method];
            for(var path in annotations) {
              var annotation = annotations[path];
              if(annotation.public) {
                docs[annotation.group][annotation.path] = annotation;
              }
            }
          }

          vars.docs = docs;
          res.render('docs/index.tpl', vars);
        });
      }
    ], function(err) {
      if(err) {
        return next(err);
      }
    });
  });

  callback();
}
