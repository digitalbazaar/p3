/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var bedrock = require('bedrock');
var payswarm = {
  config: bedrock.config,
  logger: bedrock.loggers.get('app'),
  passport: require('bedrock-passport'),
  resource: require('./resource'),
  validation: require('bedrock-validation'),
  views: require('bedrock-views')
};
var validate = payswarm.validation.validate;

// constants
var MODULE_NS = 'payswarm.services';

// module API
var api = {};
api.name = MODULE_NS + '.license';
api.namespace = MODULE_NS;
module.exports = api;

// add services
bedrock.events.on('bedrock-express.configure.routes', addServices);


/**
 * Adds web services to the server.
 *
 * @param app the bedrock application.
 * @param callback(err) called once the services have been added to the server.
 */
function addServices(app, callback) {
  var ensureAuthenticated = payswarm.passport.ensureAuthenticated;
  var getDefaultViewVars = payswarm.views.getDefaultViewVars;

  app.get('/licenses/:license', function(req, res, next) {
    getDefaultViewVars(req, function(err, vars) {
      if(err) {
        return callback(err);
      }
      var license = req.params.license;
      res.render('licenses/' + license + '.html', vars);
    });
  });

  app.post('/licenses',
    ensureAuthenticated,
    validate('services.license.cacheLicense'),
    function(req, res, next) {
      // FIXME: rate limit particular identities

      var query = {id: req.body.license};
      if('licenseHash' in req.body) {
        query.licenseHash = req.body.licenseHash;
      }
      query.type = 'License';
      query.strict = true;
      query.fetch = true;
      payswarm.resource.license.get(query, function(err, records) {
        if(err) {
          return next(err);
        }
        res.json(records[0].resource);
      });
  });

  callback(null);
}
