/*
 * PaySwarm development configuration data.
 *
 * Copyright (c) 2014 Digital Bazaar, Inc. All rights reserved.
 */
var config = require('bedrock').config;
var constants = config.constants;
var baseIdPath = config.server.baseUri + config.identity.basePath;
var authorityId = config.authority.id;

// test address validator
config.addressValidator.test = {};
config.addressValidator.test.key = 'testhashkey';
config.addressValidator.test.address = {
  '@context': constants.PAYSWARM_CONTEXT_V1_URL,
  name: 'Full Name',
  streetAddress: '100 Street Apt 1',
  addressLocality: 'City',
  addressRegion: 'State',
  postalCode: '10000',
  addressCountry: 'US'
};

// financial defaults
config.financial.defaults.account = {
  // demo with $10
  '@context': constants.PAYSWARM_CONTEXT_V1_URL,
  type: 'FinancialAccount',
  balance: '10.0000000',
  currency: 'USD',
  sysPublic: [],
  sysStatus: 'active'
};
config.financial.createDefaultPaymentTokens = true;
config.financial.defaults.paymentTokens.push({
  // demo payment token source
  '@context': constants.PAYSWARM_CONTEXT_V1_URL,
  type: 'CreditCard',
  label: 'My Visa',
  paymentGateway: 'Test',
  cardBrand: 'Visa',
  cardNumber: '4111111111111111',
  cardExpMonth: 11,
  cardExpYear: 2016,
  cardCvm: '111',
  address: {
    name: 'Billing Name',
    streetAddress: '1 Billing Lane',
    addressLocality: 'Locality',
    addressRegion: 'Region',
    postalCode: '12345',
    addressCountry: 'US'
  },
  sysStatus: 'active',
  sysVerified: true,
  sysVerifyReady: true
});
// dev authority payment token for granting funds to new accounts
config.financial.devPaymentToken = 'urn:authority-bank-account';
config.financial.paymentTokens.push({
  source: {
    type: 'BankAccount',
    bankAccount: '1234567890',
    bankAccountType: 'Checking',
    bankRoutingNumber: '987654321'
  },
  gateway: 'Authority',
  token: {
    '@context': constants.PAYSWARM_CONTEXT_V1_URL,
    id: config.financial.devPaymentToken,
    type: 'PaymentToken',
    label: 'Authority External Bank Account',
    owner: authorityId,
    sysStatus: 'active',
    sysVerified: true,
    sysVerifyReady: true
  }
});
// promo authority payment token for granting funds for claimed promo codes
config.promo.paymentToken = 'urn:authority-bank-account';

// identities

// Admin
config.identity.identities.push({
  '@context': constants.PAYSWARM_CONTEXT_V1_URL,
  id: config.admin.id,
  type: 'Identity',
  sysSlug: 'admin',
  label: 'Admin',
  email: 'admin@payswarm.dev',
  sysPassword: 'password',
  sysPublic: ['label', 'url', 'description'],
  sysRegulatoryAddress: {
    type: 'Address',
    addressRegion: 'State',
    addressCountry: 'US'
  },
  sysResourceRole: [{
    sysRole: 'payswarm.admin'
  }],
  sysStatus: 'active',
  url: config.server.baseUri,
  description: 'Administrator'
});

// Authority
config.identity.identities.push({
  '@context': constants.PAYSWARM_CONTEXT_V1_URL,
  id: config.authority.id,
  type: 'Identity',
  sysSlug: 'authority',
  label: config.authority.name,
  email: 'authority@payswarm.dev',
  sysPassword: 'password',
  sysPublic: ['label', 'url', 'description'],
  sysRegulatoryAddress: {
    type: 'Address',
    addressRegion: 'State',
    addressCountry: 'US'
  },
  sysResourceRole: [{
    sysRole: 'identity.registered',
    generateResource: 'id'
  }],
  sysStatus: 'active',
  url: config.server.baseUri,
  description: 'Authority'
});

// Dev
config.identity.identities.push({
  '@context': constants.PAYSWARM_CONTEXT_V1_URL,
  id: baseIdPath + '/dev',
  type: 'Identity',
  sysSlug: 'dev',
  label: 'Dev',
  email: 'dev@payswarm.dev',
  sysPassword: 'password',
  sysResourceRole: [{
    sysRole: 'identity.registered',
    generateResource: 'id'
  }],
  sysStatus: 'active'
});

// Customer
config.identity.identities.push({
  '@context': constants.PAYSWARM_CONTEXT_V1_URL,
  id: baseIdPath + '/customer',
  type: 'Identity',
  sysSlug: 'customer',
  label: 'Customer',
  email: 'customer@payswarm.dev',
  sysPassword: 'password',
  sysResourceRole: [{
    sysRole: 'identity.registered',
    generateResource: 'id'
  }],
  sysStatus: 'active'
});

// Vendor
config.identity.identities.push({
  '@context': constants.PAYSWARM_CONTEXT_V1_URL,
  id: baseIdPath + '/vendor',
  type: 'Identity',
  sysSlug: 'vendor',
  label: 'Vendor',
  email: 'vendor@payswarm.dev',
  sysPublic: ['label', 'url', 'description'],
  sysPassword: 'password',
  sysRegulatoryAddress: {
    type: 'Address',
    addressRegion: 'State',
    addressCountry: 'US'
  },
  sysResourceRole: [{
    sysRole: 'identity.registered',
    generateResource: 'id'
  }],
  sysStatus: 'active',
  url: 'http://wordpress.payswarm.dev',
  description: 'The default PaySwarm Vendor',
  address: [{
    label: 'Business',
    type: 'Address',
    name: 'Shop Owner',
    streetAddress: '100 Vendor St',
    addressLocality: 'City',
    addressRegion: 'State',
    postalCode: '10000',
    addressCountry: 'US',
    sysValidated: true
  }]
});

// keys
config.identity.keys.push({
  publicKey: {
    '@context': constants.PAYSWARM_CONTEXT_V1_URL,
    id: config.authority.id + '/keys/1',
    type: 'CryptographicKey',
    owner: config.authority.id,
    label: 'Key 1',
    publicKeyPem: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqMbYknpvLLx6+ZQ3IucP\nl6dsEdSj82CBw9Xd7GQIsD7qYIzE18LKe9I+SroxHhDDpBuwTZREV9kOwyvOcvbD\nbp46+ymA7TGIRoScz6L7e8QSCqEPg/z6FBWtsCNpVx+AUF68Ci99IBU0xWKHyPRp\n6ZHpW9ET4150Q3ZFQLcw7xD8pt9lCb7YGbmWcZWYvMysLRZ4ihuYCbbaBzgtTp3i\nQQGmrZ2gcQVwdx898/OcJ8Kj9PNJEyoydoqcIQtVyQtfKev+Ofegy6pfH69i5+Z3\nOqs2Ochr3tVnzPAMIVsvW/eVtnXacyxUsyT+m2uhRtC+e72zlDmobpLPm7RPYGJA\nkQIDAQAB\n-----END PUBLIC KEY-----\n'
  },
  privateKey: {
    '@context': constants.PAYSWARM_CONTEXT_V1_URL,
    type: 'CryptographicKey',
    owner: config.authority.id,
    label: 'Key 1',
    publicKey: config.authority.id + '/keys/1',
    privateKeyPem: '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEAqMbYknpvLLx6+ZQ3IucPl6dsEdSj82CBw9Xd7GQIsD7qYIzE\n18LKe9I+SroxHhDDpBuwTZREV9kOwyvOcvbDbp46+ymA7TGIRoScz6L7e8QSCqEP\ng/z6FBWtsCNpVx+AUF68Ci99IBU0xWKHyPRp6ZHpW9ET4150Q3ZFQLcw7xD8pt9l\nCb7YGbmWcZWYvMysLRZ4ihuYCbbaBzgtTp3iQQGmrZ2gcQVwdx898/OcJ8Kj9PNJ\nEyoydoqcIQtVyQtfKev+Ofegy6pfH69i5+Z3Oqs2Ochr3tVnzPAMIVsvW/eVtnXa\ncyxUsyT+m2uhRtC+e72zlDmobpLPm7RPYGJAkQIDAQABAoIBAFBxFeAawspLu0Eh\nR3Y3MtNRVMza0Jm7MZ4pXPDCbPGzyvnhniBIE0IY3t+3BpoR221oVQtk034bUlHr\nmyZoPpWGjQ4QpgZnSVBy/Fpqj/pZZU/zm/WIqZjRDEubVSXVOc8UmAMyxyx3bwN1\nBsrc024jwVmluRjxd/B/elpx9by7Ub50tJgdrUMJU5QuzPKXublnUVZFH9czg3ck\noDbZCEkKL1yvCqxbD0EOZl/C/Rfw/jFT4bCDHu5h8JQSuBZ7Rpj1CThbA3LYsESj\nax4CQ57jWIkqcwXKvy74mY9uxPxR6S7JQt1uA0NPfcGPFcnODNDJkpFu395RsUVB\nhXptMAECgYEA1JKzGUwksqNP2cnfbHXnOflpXUCorbnaPjGKysZU7dqSe/ygxGUP\ngQyJS2Mbvlcx1MkobEZtuw6ESjhuTwmKaZ4g+KhhdH/D0izca4m5DamirFBwkhfy\nXxNa1j6VVcLMDJB0FdkSaqGgq/6e0L391O4l+KaC4L5W+F4MwKWU68ECgYEAy0Gn\nw2QFbsqksQmlk134QsGNFpYCUn4fmD1V3EJAPdliBIJAsTRmezvKkYLmQEUXTJQf\nasdBPanpJuGaiJcnSigBbFS9csOWzCzq5k8mz0giFMZW7mUuEM7ktENISfO5kiAN\nnyzDhrndvsEEnbbJWeBIqePE3a0CHSRjk51fyNECgYBi/yLrgBuDGi1g1vP3Nf2G\ncVIRfMBRj8FEv5vMjYsV7nnTxjY04H/U8Lqr4i8UeNUbLMdnjXEi8ULIsfklU+Mj\nBuKCCyC/uZS/t+a7KjuFUmAQ8bFLSF22y3O9XQ39D6gpnciCOEKsaDNEhmL+Ac1J\nsdL7Nsiy09H6/wnfWf29wQKBgCTZ0HrCZaHCp71ZTGW9gcdIpDXWGLGwIDZP2INI\nl7Ee+oBqxSPbpkDthDqBixFX9XNy34dSfOebKKRd/tCI5xywyCFF89sczvhRpH0B\nGL44C8XMd/Jc8c8mU5zDHhYaVCjEGvQi/4grpqJxCE831qWu3j2/B/BQ77Ms58jZ\nnYYhAoGBAIQFLVpI6HLah+ETKpH5+/SPqBE5D9YPATGIjczU/WVKyclnVzlEmE2I\n4Ddv5Usp7KQdDaM/ZZ4Ict3mXJf9Sf/JxqMfex7rHD2s3zHm52LZEmqwk9Cx3hFV\njQZJvKo6cWiuyPAZFh1TNZsQUaLnXNLJUWdIjXqKI4aQ9fdTi5E+\n-----END RSA PRIVATE KEY-----\n'
  }
});

// accounts
// fees first so auto-deposit has a fee account to work with
config.financial.accounts.push({
  '@context': constants.PAYSWARM_CONTEXT_V1_URL,
  id: authorityId + '/accounts/fees',
  type: 'FinancialAccount',
  owner: authorityId,
  sysSlug: 'fees',
  sysRegulations: 'urn:regulation:unregulated',
  label: config.authority.name + ' Fees Account',
  sysPublic: ['label', 'owner'],
  currency: 'USD',
  sysAllowStoredValue: true
});
config.financial.accounts.push({
  '@context': constants.PAYSWARM_CONTEXT_V1_URL,
  id: authorityId + '/accounts/main',
  type: 'FinancialAccount',
  owner: authorityId,
  sysSlug: 'main',
  sysRegulations: 'urn:regulation:unregulated',
  label: config.authority.name + ' Main Account',
  currency: 'USD',
  sysAllowStoredValue: true
});
config.financial.accounts.push({
  '@context': constants.PAYSWARM_CONTEXT_V1_URL,
  id: authorityId + '/accounts/verify',
  type: 'FinancialAccount',
  owner: authorityId,
  sysSlug: 'verify',
  sysRegulations: 'urn:regulation:unregulated',
  label: config.authority.name + ' Verify Source Account',
  currency: 'USD',
  sysAllowStoredValue: true
});
config.financial.accounts.push({
  '@context': constants.PAYSWARM_CONTEXT_V1_URL,
  id: baseIdPath + '/dev/accounts/primary',
  type: 'FinancialAccount',
  owner: baseIdPath + '/dev',
  sysSlug: 'primary',
  label: 'Primary Account',
  currency: 'USD'
});
config.financial.accounts.push({
  '@context': constants.PAYSWARM_CONTEXT_V1_URL,
  id: baseIdPath + '/customer/accounts/primary',
  type: 'FinancialAccount',
  owner: baseIdPath + '/customer',
  sysSlug: 'primary',
  label: 'Primary Account',
  currency: 'USD'
});
config.financial.accounts.push({
  '@context': constants.PAYSWARM_CONTEXT_V1_URL,
  id: baseIdPath + '/vendor/accounts/primary',
  type: 'FinancialAccount',
  owner: baseIdPath + '/vendor',
  sysSlug: 'primary',
  sysRegulations: 'urn:regulation:unregulated',
  label: 'Primary Account',
  sysPublic: ['label', 'owner'],
  currency: 'USD'
});

// fees account
config.financial.feesAccount = authorityId + '/accounts/fees';
// payment token verification account (for withdrawing funds)
config.financial.paymentTokenVerifyAccount = authorityId + '/accounts/verify';

// payee schemes
var defaultPayeeSchemeId = authorityId + '/payee-schemes/default';
var defaultPayeeScheme = {
  id: defaultPayeeSchemeId,
  type: 'PayeeScheme',
  payee: [{
    type: 'Payee',
    destination: authorityId + '/accounts/main',
    currency: 'USD',
    payeeGroup: ['authority'],
    payeeRate: '2.00',
    payeeRateType: 'Percentage',
    payeeApplyType: 'ApplyInclusively',
    maximumAmount: '10.00',
    comment: config.authority.name + ' Processing'
  }],
  sysMinimumAmounts: {}
};
// minimum amounts for default payee scheme
defaultPayeeScheme.sysMinimumAmounts[
  authorityId + '/accounts/main'] = '0.000002';
config.financial.payeeSchemes[defaultPayeeSchemeId] = defaultPayeeScheme;

// gateways
config.financial.paymentGateways.push('./pg.authority');
config.financial.paymentGateways.push('./pg.test');
config.financial.paymentGateway = config.financial.paymentGateway || {};
config.financial.paymentGateway.Test = {};
config.financial.paymentGateway.Test.payees = {};
config.financial.paymentGateway.Test.payees.deposit = {};
config.financial.paymentGateway.Test.payees.withdrawal = {};

// increment settleAfter by 30 seconds when status check result is pending
config.financial.paymentGateway.Test.bankAccountStatusSettleAfterIncrement =
  1000 * 30;
config.financial.paymentGateway.Test.creditCardStatusSettleAfterIncrement =
  1000 * 30;

// source/destination for funds due to rounding adjustments
config.financial.paymentGateway.Test.roundingAdjustmentAccount =
  authorityId + '/accounts/fees';

/* A note about merchant service fee payees:

  Fees for deposits are applied exclusively so that the amount selected for
  deposit is the amount that will appear in a customer's account; additional
  fees will be added to the total charged to a payment token.

  Fees for withdrawals are applied inclusively so that a withdrawal amount
  can't be chosen that, after applying fees, will be greater than the balance
  of an account. Here we don't want the total to increase.

  The way we are charged by external merchant service providers is based on
  the total transaction amount they see, that is the amount charged or credited
  to a payment token -- referred to below as the "gateway total". More
  specifically, we are charged on the sum of all transactions performed in a
  statement period -- which is important with respect to rounding errors and
  is why we always round up when collecting fees.

  Here's what the percentage fee formula looks like that the merchant service
  providers use:

  gateway_total * fee_rate = fee_amount

  When we do deposits, we add the fee amount to the pre-fee total to get
  the gateway total:

  pre_fee_total + fee_amount = external_total
  => pre_fee_total + (gateway_total * fee_rate) = gateway_total
  => pre_fee_total = gateway_total - (gateway_total * fee_rate)
  => pre_fee_total = gateway_total * (1 - fee_rate)
  => pre_fee_total * (1 / (1 - fee_rate)) = gateway_total

  The formula for an exclusive payee, used for deposit fees (we add the
  fee onto the amount sent to the gateway), is:

  pre_fee_total + pre_fee_total * payee_rate = gateway_total
  => pre_fee_total * (1 + payee_rate) = gateway_total

  We can see that the last formula lines for the above two formulas allow us
  to solve for the payee_rate via the fee_rate; a substitution gives us:

  (1 + payee_rate) = (1 / (1 - fee_rate))
  => payee_rate = (1 / (1 - fee_rate)) - 1

  This tells us how to calculate the payee rate for an exclusive percentage
  payee that is representing a fee that is calculated as described above.

  Now, when we do withdrawals, we subtract the fee amount from the pre-fee
  total to generate a new total, that will be sent to the gateway:

  pre_fee_total - fee_amount = gateway_total
  => pre_fee_total - (gateway_total * fee_rate) = gateway_total
  => pre_fee_total = gateway_total + (gateway_total * fee_rate)
  => pre_fee_total = gateway_total * (1 + fee_rate)
  => pre_fee_total * (1 / (1 + fee_rate)) = gateway_total

  The formula for an inclusive payee, used for withdrawal fees (we take
  the fee out of the number sent to the gateway), is:

  pre_fee_total - pre_fee_total * payee_rate = gateway_total
  => pre_fee_total * (1 - payee_rate) = gateway_total

  Just like with deposits, we can substitute to get the payee_rate in terms
  of the fee_rate:

  (1 - payee_rate) = (1 / (1 + fee_rate))
  => payee_rate = 1 - (1 / (1 + fee_rate))

  Again, this tells use exactly how to calculate the payee rate for an
  inclusive percentage payee that is representing a fee as described above.

  There's one more thing to keep in mind -- which is when to apply the
  percentage fees, namely, before or after dealing with flat fees for the
  gateway. The answer is that the percentages must be applied after adding
  or removing fees from the gateway total because the external merchant
  service formula will always apply to the final gateway total (it knows
  nothing about what comprised that number). */

// shared for any CC or bank account gateway
var merchantBankFixedDepositPayee = {
  type: 'Payee',
  destination: authorityId + '/accounts/fees',
  currency: 'USD',
  payeeGroup: ['authority', 'authority_flat'],
  payeeApplyGroup: ['authority_gateway'],
  payeeExemptGroup: ['authority_gatewayFlatExempt', 'authority_exempt'],
  payeeRateType: 'FlatAmount',
  payeeRate: '0.11',
  payeeApplyType: 'ApplyExclusively',
  comment: 'Merchant Bank Service (Fixed Charge)'
};
var merchantBankFixedWithdrawalPayee = {
  type: 'Payee',
  destination: authorityId + '/accounts/fees',
  currency: 'USD',
  payeeGroup: ['authority', 'authority_flat'],
  payeeApplyGroup: ['authority_gateway'],
  payeeExemptGroup: ['authority_gatewayFlatExempt', 'authority_exempt'],
  payeeRateType: 'FlatAmount',
  payeeRate: '0.11',
  payeeApplyType: 'ApplyInclusively',
  comment: 'Merchant Bank Service (Fixed Charge)'
};

// BankAccount fees
config.financial.paymentGateway.Test.payees.deposit.BankAccount = [{
  type: 'Payee',
  destination: authorityId + '/accounts/fees',
  currency: 'USD',
  payeeGroup: ['authority', 'authority_percentage'],
  payeeApplyGroup: ['authority_gateway', 'authority_flat'],
  payeeExemptGroup: ['authority_gatewayPercentageExempt', 'authority_exempt'],
  payeeRateType: 'Percentage',
  // ((1 / (1 - 0.0099)) - 1) * 100, see note above for details
  payeeRate: '0.9998990002',
  payeeApplyType: 'ApplyExclusively',
  comment: 'Bank ACH Deposit Service (Percentage Charge)'
}, {
  type: 'Payee',
  destination: authorityId + '/accounts/fees',
  currency: 'USD',
  payeeGroup: ['authority', 'authority_flat'],
  payeeApplyGroup: ['authority_gateway'],
  payeeExemptGroup: ['authority_gatewayFlatExempt', 'authority_exempt'],
  payeeRateType: 'FlatAmount',
  payeeRate: '0.50',
  payeeApplyType: 'ApplyExclusively',
  comment: 'Bank ACH Deposit Service (Fixed Charge)'
}, merchantBankFixedDepositPayee];
config.financial.paymentGateway.Test.payees.withdrawal.BankAccount = [{
  type: 'Payee',
  destination: authorityId + '/accounts/fees',
  currency: 'USD',
  payeeGroup: ['authority', 'authority_percentage'],
  payeeApplyGroup: ['authority_gateway'],
  payeeApplyAfter: ['authority_flat'],
  payeeExemptGroup: ['authority_gatewayPercentageExempt', 'authority_exempt'],
  payeeRateType: 'Percentage',
  // (1 - (1 / (1 + 0.0099))) * 100, see above note for details
  payeeRate: '0.9802950788',
  payeeApplyType: 'ApplyInclusively',
  comment: 'Bank ACH Withdrawal Service (Percentage Charge)'
}, {
  type: 'Payee',
  destination: authorityId + '/accounts/fees',
  currency: 'USD',
  payeeGroup: ['authority', 'authority_flat'],
  payeeApplyGroup: ['authority_gateway'],
  payeeExemptGroup: ['authority_gatewayFlatExempt', 'authority_exempt'],
  payeeRateType: 'FlatAmount',
  payeeRate: '0.50',
  payeeApplyType: 'ApplyInclusively',
  comment: 'Bank ACH Withdrawal Service (Fixed Charge)'
}, merchantBankFixedWithdrawalPayee];

// CreditCard fees
var ccPercentPayee = {
  type: 'Payee',
  destination: authorityId + '/accounts/fees',
  currency: 'USD',
  payeeGroup: ['authority', 'authority_percentage'],
  payeeApplyGroup: ['authority_gateway', 'authority_flat'],
  payeeExemptGroup: ['authority_gatewayPercentageExempt', 'authority_exempt'],
  payeeRateType: 'Percentage',
  // ((1 / (1 - 0.0214)) - 1) * 100, see note above for details
  payeeRate: '2.1867974658',
  payeeApplyType: 'ApplyExclusively',
  comment: 'Card Processing Service (Percentage Charge)'
};
var ccFixedPayee = {
  type: 'Payee',
  destination: authorityId + '/accounts/fees',
  currency: 'USD',
  payeeGroup: ['authority', 'authority_flat'],
  payeeApplyGroup: ['authority_gateway'],
  payeeExemptGroup: ['authority_gatewayFlatExempt', 'authority_exempt'],
  payeeRateType: 'FlatAmount',
  payeeRate: '0.15',
  payeeApplyType: 'ApplyExclusively',
  comment: 'Card Processing Service (Fixed Charge)'
};
// extra 0.15 for amex
var ccAmexPayee = {
  type: 'Payee',
  destination: authorityId + '/accounts/fees',
  currency: 'USD',
  payeeGroup: ['authority', 'authority_flat'],
  payeeApplyGroup: ['authority_gateway'],
  payeeExemptGroup: ['authority_gatewayFlatExempt', 'authority_exempt'],
  payeeRateType: 'FlatAmount',
  payeeRate: '0.15',
  payeeApplyType: 'ApplyExclusively',
  comment: 'Card Processing Service (American Express Fixed Charge)'
};
config.financial.paymentGateway.Test.payees.deposit.CreditCard = {};
config.financial.paymentGateway.Test.payees.deposit.CreditCard
  ['default'] = [
  ccPercentPayee,
  ccFixedPayee,
  merchantBankFixedDepositPayee
];
config.financial.paymentGateway.Test.payees.deposit.CreditCard
  .AmericanExpress = [
  ccPercentPayee,
  ccFixedPayee,
  ccAmexPayee,
  merchantBankFixedDepositPayee
];

// set bank account settlement to happen immediately
config.financial.paymentGateway.Test.bankAccountSettlement = 0;
