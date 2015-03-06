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
require('bedrock-mongodb');
require('bedrock-request-limiter');
require('bedrock-requirejs');
require('bedrock-server');
require('bedrock-session-mongodb');
require('bedrock-validation');
require('bedrock-views');

// payswarm modules
/*
require('./lib/payswarm-auth/monitors');
'database';
'scheduler';
'mail';
'permission';
'identity';
require('./lib/payswarm-auth/authority');
require('./lib/payswarm-auth/identityAddress');
require('./lib/payswarm-auth/identityPreferences');
require('./lib/payswarm-auth/resource');
require('./lib/payswarm-auth/financial');
require('./lib/payswarm-auth/promo');
//require('./lib/payswarm-auth/hosted.asset');
//require('./lib/payswarm-auth/hosted.listing');
'website';
'services.docs';
'services.identity';
'services.identifier';
'services.key';
'services.session';
'services.well-known';
*/
require('./lib/payswarm-auth/financial');
require('./lib/payswarm-auth/services.account');
require('./lib/payswarm-auth/services.address');
//require('./lib/payswarm-auth/services.assetora');
require('./lib/payswarm-auth/services.budget');
//require('./lib/payswarm-auth/services.hosted.asset');
//require('./lib/payswarm-auth/services.hosted.listing');
require('./lib/payswarm-auth/services.identityPreferences');
require('./lib/payswarm-auth/services.license');
require('./lib/payswarm-auth/services.paymentToken');
require('./lib/payswarm-auth/services.payswarm.identifier');
require('./lib/payswarm-auth/services.promo');
//require('./lib/payswarm-auth/services.system');
//require('./lib/payswarm-auth/services.test');
//require('./lib/payswarm-auth/services.tools');
require('./lib/payswarm-auth/services.transaction');
require('./lib/payswarm-auth/services.vendor');
require('./lib/payswarm-auth/services.well-known');

// load config and dev data
require('./configs/payswarm.dev');
require('./configs/dev-data');

bedrock.start();
