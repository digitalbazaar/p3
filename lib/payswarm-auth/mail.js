/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var email = require('emailjs');
var payswarm = {
  config: require('../config'),
  events: require('./events'),
  logger: require('./loggers').get('app'),
  tools: require('./tools')
};
var PaySwarmError = payswarm.tools.PaySwarmError;
var MailParser = require('mailparser').MailParser;

// constants
var MODULE_TYPE = 'payswarm.mail';
var MODULE_IRI = 'https://payswarm.com/modules/mail';

var api = {};
api.name = MODULE_TYPE + '.Mail';
module.exports = api;

// email client
var client;

// template ID => filename mapping
var templates = {};

// event detail triggers
var triggers = {};

// FIXME: load a copy of swig (hack because swig doesn't support multiple
// configurations yet)
delete require.cache[require.resolve('swig')];
var swig = require('swig');
swig.init({
  allowErrors: true,
  autoescape: false,
  cache: payswarm.config.mail.templates.cache,
  encoding: 'utf8',
  root: payswarm.config.mail.templates.path,
  tzOffset: 0
});

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
      if(payswarm.config.mail.send) {
        // connect to smtp server
        client = email.server.connect(payswarm.config.mail.connection);
      }
      callback();
    },
    function(callback) {
      // load template mappers in order
      var mappers = payswarm.config.mail.templates.mappers;
      mappers.forEach(function(mapper) {
        require(mapper).map(templates);
      });

      // attach listeners for events from config
      var events = payswarm.config.mail.events;
      async.forEach(events, function(info, callback) {
        payswarm.logger.debug('mailer registering for event: ' + info.type);
        payswarm.events.on(info.type, function(event) {
          payswarm.logger.debug('mailer handling event: ' + event.type);

          async.waterfall([
            function(callback) {
              if(event.details && event.details.triggers) {
                return async.forEachSeries(
                  event.details.triggers, function(name, callback) {
                    if(!(name in triggers)) {
                      payswarm.logger.debug(
                        'mailer has no triggers for: ' + name);
                      return callback();
                    }
                    payswarm.logger.debug(
                      'mailer firing triggers for: ' + name);
                    async.forEachSeries(triggers[name],
                      function(trigger, callback) {
                        trigger(event, callback);
                      }, callback);
                }, callback);
              }
              callback();
            },
            function(callback) {
              // build mail vars
              var vars = payswarm.tools.extend(
                payswarm.tools.clone(payswarm.config.mail.vars),
                payswarm.tools.clone(info.vars || {}),
                payswarm.tools.clone(event.details || {}));

              // send message
              api.send(info.template, vars, callback);
            }
          ], function(err, details) {
            if(err) {
              payswarm.logger.error(
                'could not send email for event ' + info.type + ': ' +
                err.message, {error: err});
            } else if(details) {
              payswarm.logger.debug('sent email details', details);
            }
          });
        });
        callback();
      }, callback);
    }
  ], callback);
};

/**
 * Registers a trigger that will be fired if found in event.details.triggers.
 * The trigger may modify the details of the event.
 *
 * @param name the name of the trigger in event.details.trigger.
 * @param trigger(event, callback) the trigger function to call.
 */
api.registerTrigger = function(name, trigger) {
  if(!(name in triggers)) {
    triggers[name] = [];
  }
  triggers[name].push(trigger);
};

/**
 * Sends an email using the given template ID and variables.
 *
 * @param id the ID of the template to use for the email.
 * @param vars the variables to use to populate the email.
 * @param callback(err, details) called once the operation completes.
 */
api.send = function(id, vars, callback) {
  var entry = templates[id];
  if(!entry) {
    return callback(new PaySwarmError(
      'Could not send email; unknown email template ID.',
      MODULE_TYPE + '.UnknownEmailTemplateId', {id: id}));
  }

  // outputs JSON
  vars.toJson = function(value) {
    return JSON.stringify(value, null, 2);
  };

  var email;
  try {
    // FIXME: use swig.compileFile once swig allows multiple root directories

    // produce email
    var tpl = swig.compile(entry.template, {filename: entry.filename});
    email = tpl(vars);
  } catch(ex) {
    return callback(new PaySwarmError(
      'Could not send email; a template parsing error occurred.',
      MODULE_TYPE + '.TemplateParseError', {}, ex));
  }

  // parse email into message parameter
  var mailParser = new MailParser();
  mailParser.on('error', function(err) {
    return callback(new PaySwarmError(
      'Could not send email; a mail parsing error occurred.',
      MODULE_TYPE + '.MailParseError', {}, err));
  });
  mailParser.on('end', function(parsed) {
    // create message to send
    var message = parsed.headers;
    message.text = parsed.text;

    if(!message.to || !message.from || !message.text) {
      return callback(new PaySwarmError(
        'Could not send email; message is missing "to", "from", or "text".',
        MODULE_TYPE + '.InvalidMessage', {message: message}));
    }

    // only send message if client is defined
    if(client) {
      return client.send(message, callback);
    }

    // log message instead
    var meta = {
      details: message,
      preformatted: {emailBody: '\n' + message.text}
    };
    delete message.text;
    payswarm.logger.debug('email logged instead of sent: ', meta);
    callback();
  });
  mailParser.write(email);
  mailParser.end();
};
