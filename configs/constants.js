/*
 * PaySwarm constants configuration.
 *
 * Copyright (c) 2014 Digital Bazaar, Inc. All rights reserved.
 */
var constants = require('bedrock').config.constants;
var fs = require('fs');
var path = require('path');

/**
 * Versioned PaySwarm JSON-LD context URLs.
 */
constants.CONTEXT_V1_URL = 'https://w3id.org/payswarm/v1';

/**
 * v1 PaySwarm JSON-LD context.
 */
constants.CONTEXTS[constants.CONTEXT_V1_URL] = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '..', 'site/static/contexts/openbadges-v1.jsonld'),
    {encoding: 'utf8'}));

/**
 * Default PaySwarm JSON-LD context URL.
 */
constants.CONTEXT_URL = constants.CONTEXT_V1_URL;

/**
 * Default PaySwarm JSON-LD context.
 */
constants.CONTEXT = constants.CONTEXTS[constants.CONTEXT_URL];

/**
 * PaySwarm JSON-LD frames.
 *
 * This object can be extended from other modules to add support for
 * hardcoded frames.
 */
constants.FRAMES = {};

/** PaySwarm JSON-LD frame for an Asset. */
constants.FRAMES.Asset = {
  '@context': constants.CONTEXT_URL,
  type: 'Asset',
  creator: {},
  signature: {'@embed': true},
  assetProvider: {'@embed': false}
};

/** PaySwarm JSON-LD frame for a License. */
constants.FRAMES.License = {
  '@context': constants.CONTEXT_URL,
  type: 'License'
};

/** PaySwarm JSON-LD frame for a Listing. */
constants.FRAMES.Listing = {
  '@context': constants.CONTEXT_URL,
  type: 'Listing',
  asset: {'@embed': false},
  license: {'@embed': false},
  vendor: {'@embed': false},
  signature: {'@embed': true}
};

/** Pseudo type used for a short contract. */
constants.FRAMES['Contract/Short'] = {
  '@context': constants.CONTEXT_URL,
  type: 'Contract',
  '@explicit': true,
  asset: {
    '@explicit': true,
    type: 'Asset',
    id: {},
    assetContent: {}
  },
  license: {'@embed': false},
  listing: {'@embed': false},
  assetProvider: {'@embed': false},
  assetAcquirer: {'@embed': false},
  vendor: {'@embed': false}
   // TODO: add any other necessary short-form information
};

// payee constants
var PAYEE = constants.PAYEE = {};
PAYEE.RATE_TYPE = {
  /** A flat amount. */
  FLAT: 'FlatAmount',
  /** A percentage. */
  PERCENTAGE: 'Percentage'
};
PAYEE.APPLY_TYPE = {
  /** The Payee amount will be added "on the top" of the base amount the
  Payee rate is applied to, increasing the total payment. For flat amount
  rates, multiply the rate by the number of applicable Payees to get the total
  amount. For percent rates, take the rate as a percentage of the total of the
  applicable Payees to get the total amount; this is like a typical sales
  tax. */
  EXCLUSIVE: 'ApplyExclusively',
  /** The Payee amount will be included or taken "off the top" of the base
  amount the Payee rate is applied to, keeping the total payment the same. For
  flat amount rates, take an equal part (percentage-wise) out of each
  applicable Payee to get to the total amount. For percent rates, take the
  rate as a percentage from each applicable Payee to get the total amount; this
  is like a typical income tax. */
  INCLUSIVE: 'ApplyInclusively'
};
