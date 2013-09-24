/*
 * Copyright (c) 2013 Digital Bazaar, Inc. All rights reserved.
 */
var _ = require('underscore');
var util = require('util');
var jsonld = require('./jsonld'); // use locally-configured jsonld

var api = {};
module.exports = api;

/**
 * Versioned PaySwarm JSON-LD context URLs.
 */
api.CONTEXT_V1_URL = 'https://w3id.org/payswarm/v1';

/**
 * Supported PaySwarm JSON-LD contexts.
 *
 * This object can be extended from other modules to add support for
 * hardcoded contexts.
 */
api.CONTEXTS = {};

/**
 * V1 PaySwarm JSON-LD context.
 */
api.CONTEXTS[api.CONTEXT_V1_URL] = {
  // aliases
  id: '@id',
  type: '@type',

  // prefixes
  ccard: 'https://w3id.org/commerce/creditcard#',
  com: 'https://w3id.org/commerce#',
  dc: 'http://purl.org/dc/terms/',
  foaf: 'http://xmlns.com/foaf/0.1/',
  gr: 'http://purl.org/goodrelations/v1#',
  pto: 'http://www.productontology.org/id/',
  ps: 'https://w3id.org/payswarm#',
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  sec: 'https://w3id.org/security#',
  vcard: 'http://www.w3.org/2006/vcard/ns#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',

  // general
  address: {'@id': 'vcard:adr', '@type': '@id'},
  comment: 'rdfs:comment',
  countryName: 'vcard:country-name',
  created: {'@id': 'dc:created', '@type': 'xsd:dateTime'},
  creator: {'@id': 'dc:creator', '@type': '@id'},
  depiction: {'@id': 'foaf:depiction', '@type': '@id'},
  description: 'dc:description',
  email: 'foaf:mbox',
  fullName: 'vcard:fn',
  label: 'rdfs:label',
  locality: 'vcard:locality',
  postalCode: 'vcard:postal-code',
  region: 'vcard:region',
  streetAddress: 'vcard:street-address',
  title: 'dc:title',
  website: {'@id': 'foaf:homepage', '@type': '@id'},
  Address: 'vcard:Address',

  // bank
  bankAccount: 'bank:account',
  bankAccountType: {'@id': 'bank:accountType', '@type': '@vocab'},
  bankRoutingNumber: 'bank:routing',
  BankAccount: 'bank:BankAccount',
  Checking: 'bank:Checking',
  Savings: 'bank:Savings',

  // credit card
  cardBrand: {'@id': 'ccard:brand', '@type': '@vocab'},
  cardCvm: 'ccard:cvm',
  cardExpMonth: {'@id': 'ccard:expMonth', '@type': 'xsd:integer'},
  cardExpYear: {'@id': 'ccard:expYear', '@type': 'xsd:integer'},
  cardNumber: 'ccard:number',
  AmericanExpress: 'ccard:AmericanExpress',
  ChinaUnionPay: 'ccard:ChinaUnionPay',
  CreditCard: 'ccard:CreditCard',
  Discover: 'ccard:Discover',
  Visa: 'ccard:Visa',
  MasterCard: 'ccard:MasterCard',

  // commerce
  account: {'@id': 'com:account', '@type': '@id'},
  amount: 'com:amount',
  authorized: {'@id': 'com:authorized', '@type': 'xsd:dateTime'},
  balance: 'com:balance',
  creditLimit: 'com:creditLimit',
  creditUsed: {'@id': 'com:creditUsed', '@type': 'xsd:dateTime'},
  currency: {'@id': 'com:currency', '@type': '@vocab'},
  destination: {'@id': 'com:destination', '@type': '@id'},
  maximumAmount: 'com:maximumAmount',
  maximumPayeeRate: 'com:maximumPayeeRate',
  minimumPayeeRate: 'com:minimumPayeeRate',
  minimumAmount: 'com:minimumAmount',
  payee: {'@id': 'com:payee', '@type': '@id', '@container': '@set'},
  payeeApplyAfter: {'@id': 'com:payeeApplyAfter', '@container': '@set'},
  payeeApplyGroup: {'@id': 'com:payeeApplyGroup', '@container': '@set'},
  payeeApplyType: {'@id': 'com:payeeApplyType', '@type': '@vocab'},
  payeeGroup: {'@id': 'com:payeeGroup', '@container': '@set'},
  payeeGroupPrefix: {'@id': 'com:payeeGroupPrefix', '@container': '@set'},
  payeeExemptGroup: {'@id': 'com:payeeExemptGroup', '@container': '@set'},
  payeeLimitation: {'@id': 'com:payeeLimitation', '@type': '@vocab'},
  payeeRate: 'com:payeeRate',
  payeeRateType: {'@id': 'com:payeeRateType', '@type': '@vocab'},
  payeeRule: {'@id': 'com:payeeRule', '@type': '@id', '@container': '@set'},
  paymentGateway: 'com:paymentGateway',
  paymentMethod: {'@id': 'com:paymentMethod', '@type': '@vocab'},
  paymentToken: 'com:paymentToken',
  referenceId: 'com:referenceId',
  settled: {'@id': 'com:settled', '@type': 'xsd:dateTime'},
  source: {'@id': 'com:source', '@type': '@id'},
  transfer: {'@id': 'com:transfer', '@type': '@id', '@container': '@set'},
  vendor: {'@id': 'com:vendor', '@type': '@id'},
  voided: {'@id': 'com:voided', '@type': 'xsd:dateTime'},
  ApplyExclusively: 'com:ApplyExclusively',
  ApplyInclusively: 'com:ApplyInclusively',
  FinancialAccount: 'com:Account',
  FlatAmount: 'com:FlatAmount',
  Deposit: 'com:Deposit',
  NoAdditionalPayeesLimitation: 'com:NoAdditionalPayeesLimitation',
  Payee: 'com:Payee',
  PayeeRule: 'com:PayeeRule',
  PayeeScheme: 'com:PayeeScheme',
  PaymentToken: 'com:PaymentToken',
  Percentage: 'com:Percentage',
  Transaction: 'com:Transaction',
  Transfer: 'com:Transfer',
  Withdrawal: 'com:Withdrawal',

  // currencies
  USD: 'https://w3id.org/currencies/USD',

  // error
  // FIXME: add error terms
  // 'errorMessage': 'err:message'

  // payswarm
  asset: {'@id': 'ps:asset', '@type': '@id'},
  assetAcquirer: {'@id': 'ps:assetAcquirer', '@type': '@id'},
  // FIXME: support inline content
  assetContent: {'@id': 'ps:assetContent', '@type': '@id'},
  assetHash: 'ps:assetHash',
  assetProvider: {'@id': 'ps:assetProvider', '@type': '@id'},
  authority: {'@id': 'ps:authority', '@type': '@id'},
  contract: {'@id': 'ps:contract', '@type': '@id'},
  identityHash: 'ps:identityHash',
  // FIXME: move?
  ipv4Address: 'ps:ipv4Address',
  license: {'@id': 'ps:license', '@type': '@id'},
  licenseHash: 'ps:licenseHash',
  licenseTemplate: 'ps:licenseTemplate',
  licenseTerms: {'@id': 'ps:licenseTerms', '@type': '@id'},
  listing: {'@id': 'ps:listing', '@type': '@id'},
  listingHash: 'ps:listingHash',
  listingRestrictions: {'@id': 'ps:listingRestrictions', '@type': '@id'},
  preferences: {'@id': 'ps:preferences', '@type': '@vocab'},
  validFrom: {'@id': 'ps:validFrom', '@type': 'xsd:dateTime'},
  validUntil: {'@id': 'ps:validUntil', '@type': 'xsd:dateTime'},
  Asset: 'ps:Asset',
  Budget: 'ps:Budget',
  Contract: 'ps:Contract',
  License: 'ps:License',
  Listing: 'ps:Listing',
  PersonalIdentity: 'ps:PersonalIdentity',
  IdentityPreferences: 'ps:IdentityPreferences',
  Profile: 'ps:Profile',
  PurchaseRequest: 'ps:PurchaseRequest',
  PreAuthorization: 'ps:PreAuthorization',
  Receipt: 'ps:Receipt',
  VendorIdentity: 'ps:VendorIdentity',

  // security
  cipherAlgorithm: 'sec:cipherAlgorithm',
  cipherData: 'sec:cipherData',
  cipherKey: 'sec:cipherKey',
  digestAlgorithm: 'sec:digestAlgorithm',
  digestValue: 'sec:digestValue',
  expiration: {'@id': 'sec:expiration', '@type': 'xsd:dateTime'},
  initializationVector: 'sec:initializationVector',
  nonce: 'sec:nonce',
  normalizationAlgorithm: 'sec:normalizationAlgorithm',
  owner: {'@id': 'sec:owner', '@type': '@id'},
  password: 'sec:password',
  privateKey: {'@id': 'sec:privateKey', '@type': '@id'},
  privateKeyPem: 'sec:privateKeyPem',
  publicKey: {'@id': 'sec:publicKey', '@type': '@id'},
  publicKeyPem: 'sec:publicKeyPem',
  publicKeyService: {'@id': 'sec:publicKeyService', '@type': '@id'},
  revoked: {'@id': 'sec:revoked', '@type': 'xsd:dateTime'},
  signature: 'sec:signature',
  signatureAlgorithm: 'sec:signatureAlgorithm',
  signatureValue: 'sec:signatureValue',
  EncryptedMessage: 'sec:EncryptedMessage',
  CryptographicKey: 'sec:Key',
  GraphSignature2012: 'sec:GraphSignature2012'
};

/**
 * Default PaySwarm JSON-LD context URL.
 */
api.CONTEXT_URL = api.CONTEXT_V1_URL;

/**
 * Default PaySwarm JSON-LD context.
 */
api.CONTEXT = api.CONTEXTS[api.CONTEXT_URL];

/**
 * PaySwarm JSON-LD frames.
 *
 * This object can be extended from other modules to add support for
 * hardcoded frames.
 */
api.FRAMES = {};

/** PaySwarm JSON-LD frame for an Asset. */
api.FRAMES.Asset = {
  '@context': api.CONTEXT_URL,
  type: 'Asset',
  creator: {},
  signature: {'@embed': true},
  assetProvider: {'@embed': false}
};

/** PaySwarm JSON-LD frame for a License. */
api.FRAMES.License = {
  '@context': api.CONTEXT_URL,
  type: 'License'
};

/** PaySwarm JSON-LD frame for a Listing. */
api.FRAMES.Listing = {
  '@context': api.CONTEXT_URL,
  type: 'Listing',
  asset: {'@embed': false},
  license: {'@embed': false},
  vendor: {'@embed': false},
  signature: {'@embed': true}
};

/** Pseudo type used for a short contract. */
api.FRAMES['Contract/Short'] = {
  '@context': api.CONTEXT_URL,
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
var PAYEE = api.PAYEE = {};
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
