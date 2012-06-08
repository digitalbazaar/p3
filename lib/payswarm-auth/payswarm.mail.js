/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var email = require('emailjs');
var jqtpl = require('jqtpl');
var path = require('path');
var payswarm = {
  config: require('../payswarm.config'),
  events: require('./payswarm.events'),
  logger: require('./payswarm.logger'),
  tools: require('./payswarm.tools')
};
var PaySwarmError = payswarm.tools.PaySwarmError;
var MailParser = require('mailparser').MailParser;

// constants
var MODULE_TYPE = 'payswarm.mail';
var MODULE_IRI = 'https://payswarm.com/modules/mail';

var api = {};
api.name = MODULE_TYPE + 'Mail';
module.exports = api;

// email client
var client;

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
      var mappers = payswarm.config.mail.templateMappers;
      for(var i in mappers) {
        require(mappers[i]);
      }

      // attach listeners for events from config
      for(var key in events) {
        var event = events[key];
        payswarm.events.on(events.type, function(event) {
          // FIXME: handle event data and send appropriate message
          payswarm.logger.debug('Mailer received event: ' + event.type);
        });
      }

      callback();
    }
  ], callback);
};

/**
 * Sends an email using the given template ID and variables.
 *
 * @param id the ID of the template to use for the email.
 * @param vars the variables to use to populate the email.
 * @param callback(err, details) called once the operation completes.
 */
api.send = function(id, vars, callback) {
  var template = payswarm.config.mail.templates[id];
  if(!template) {
    return callback(new PaySwarmError(
      'Could not send email; unknown email template ID.',
      MODULE_TYPE + '.UnknownEmailTemplateId', {id: id}));
  }

  // outputs JSON
  vars.toJson = function(value) {
    return JSON.stringify(value);
  };

  try {
    // produce email
    var email = jqtpl.tmpl(template, vars);
  }
  catch(ex) {
    return callback(new PaySwarmError(
      'Could not send email; a template parsing error occurred.',
      MODULE_TYPE + '.TemplateParseError', {error: ex}));
  }

  // parse email into message parameter
  var mailParser = new MailParser();
  mailParser.on('error', function(err) {
    return callback(new PaySwarmError(
      'Could not send email; a mail parsing error occurred.',
      MODULE_TYPE + '.MailParseError', {error: err}));
  });
  mailParser.on('end', function(parsed) {
    // create message to send
    var message = parsed.headers;
    message.text = parsed.text;

    // only send message if client is defined
    if(client) {
      return client.send(message, callback);
    }

    // log message instead
    payswarm.logger.debug('Email logged instead of sent: ', message);
    callback();
  });
  mailParser.write(email);
  mailParser.end();
};
