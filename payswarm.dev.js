/*
 * Copyright (c) 2012-2015 Digital Bazaar, Inc. All rights reserved.
 */
var bedrock = require('bedrock');

// bedrock modules
require('bedrock-docs');
require('bedrock-express');
require('bedrock-i18n');
require('bedrock-idp');
require('bedrock-passport');
require('bedrock-request-limiter');
require('bedrock-requirejs');
require('bedrock-server');
require('bedrock-validation');
require('bedrock-views');

// load config and dev data
require('./configs/payswarm.dev');
require('./configs/dev-data');

bedrock.start();
