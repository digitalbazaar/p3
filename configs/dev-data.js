var config = require('../lib/payswarm-auth').config;
var baseUri = config.authority.baseUri;
var authorityId = config.authority.id;

// test address validator
config.addressValidator.test = {};
config.addressValidator.test.key = 'testhashkey';
config.addressValidator.test.address = {
  fullName: 'Full Name',
  streetAddress: '100 Street Apt 1',
  locality: 'City',
  region: 'State',
  postalCode: '10000',
  countryName: 'US'
};

// financial defaults
config.financial.defaults.account = {
  type: 'com:Account',
  // demo with $10
  balance: '10.0000000',
  currency: 'USD',
  psaPublic: [],
  psaStatus: 'active'
};
config.financial.createDefaultPaymentTokens = true;
config.financial.defaults.paymentTokens.push({
  // demo payment token source
  type: 'ccard:CreditCard',
  label: 'My Visa',
  paymentGateway: 'Test',
  cardBrand: 'ccard:Visa',
  cardNumber: '4111111111111111',
  cardExpMonth: 11,
  cardExpYear: 2016,
  cardCvm: '111',
  address: {
    fullName: 'Billing Name',
    streetAddress: '1 Billing Lane',
    locality: 'Locality',
    region: 'Region',
    postalCode: '12345',
    countryName: 'US'
  },
  psaStatus: 'active',
  psaVerified: true,
  psaVerifyReady: true
});
// dev authority payment token for granting funds to new accounts
config.financial.devPaymentToken = 'urn:authority-bank-account';
config.financial.paymentTokens.push({
  source: {
    type: 'bank:BankAccount',
    bankAccount: '1234567890',
    bankAccountType: 'bank:Checking',
    bankRoutingNumber: '987654321'
  },
  gateway: 'Authority',
  token: {
    id: config.financial.devPaymentToken,
    type: 'com:PaymentToken',
    label: 'Authority External Bank Account',
    owner: config.authority.id,
    psaStatus: 'active',
    psaVerified: true,
    psaVerifyReady: true
  }
});
// promo authority payment token for granting funds for claimed promo codes
config.promo.paymentToken = 'urn:authority-bank-account';

// profiles
config.profile.profiles.push({
  id: baseUri + '/profiles/authority',
  type: 'ps:Profile',
  psaSlug: 'authority',
  email: 'authority@payswarm.com',
  label: 'PaySwarm Development Authority',
  psaPassword: 'password',
  psaRole: [
    baseUri + '/roles/financial_administrator',
    baseUri + '/roles/identity_administrator',
    baseUri + '/roles/role_administrator',
    baseUri + '/roles/system_administrator',
    baseUri + '/roles/profile_administrator'
  ]
});
config.profile.profiles.push({
  id: baseUri + '/profiles/dev',
  type: 'ps:Profile',
  psaSlug: 'dev',
  email: 'dev@payswarm.com',
  label: 'Dev',
  psaPassword: 'password',
  psaRole: [
    baseUri + '/roles/profile_registered',
    baseUri + '/roles/identity_manager',
    baseUri + '/roles/financial_manager']
});
config.profile.profiles.push({
  id: baseUri + '/profiles/customer',
  type: 'ps:Profile',
  psaSlug: 'customer',
  email: 'customer@payswarm.com',
  label: 'Customer',
  psaPassword: 'password',
  psaRole: [
    baseUri + '/roles/profile_registered',
    baseUri + '/roles/identity_manager',
    baseUri + '/roles/financial_manager']
});
config.profile.profiles.push({
  id: baseUri + '/profiles/vendor',
  type: 'ps:Profile',
  psaSlug: 'vendor',
  email: 'vendor@payswarm.com',
  label: 'Vendor',
  psaPassword: 'password',
  psaRole: [
    baseUri + '/roles/profile_registered',
    baseUri + '/roles/identity_manager',
    baseUri + '/roles/financial_manager'
 ]
});

// identities
config.identity.identities.push({
  id: authorityId,
  owner: baseUri + '/profiles/authority',
  psaSlug: 'authority',
  psaPublic: ['label', 'homepage', 'description'],
  label: 'PaySwarm Authority',
  homepage: baseUri,
  description: 'Development PaySwarm Authority'
});
config.identity.identities.push({
  id: baseUri + '/i/dev',
  type: 'ps:PersonalIdentity',
  owner: baseUri + '/profiles/dev',
  psaSlug: 'dev',
  label: 'Dev'
});
config.identity.identities.push({
  id: baseUri + '/i/customer',
  type: 'ps:PersonalIdentity',
  owner: baseUri + '/profiles/customer',
  psaSlug: 'customer',
  label: 'Customer'
});
config.identity.identities.push({
  id: baseUri + '/i/vendor',
  type: 'ps:VendorIdentity',
  owner: baseUri + '/profiles/vendor',
  psaSlug: 'vendor',
  label: 'Vendor',
  psaPublic: ['label', 'homepage', 'description'],
  homepage: 'http://example.com/vendor',
  description: 'The default PaySwarm Vendor',
  address: [{
    label: 'Business',
    type: 'vcard:Address',
    fullName: 'Shop Owner',
    streetAddress: '100 Vendor St',
    locality: 'City',
    region: 'State',
    postalCode: '10000',
    countryName: 'US',
    psaValidated: true
  }]
});

// keys
config.identity.keys.push({
  publicKey: {
    id: authorityId + '/keys/1',
    type: 'sec:Key',
    owner: authorityId,
    label: 'Key 1',
    publicKeyPem: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqMbYknpvLLx6+ZQ3IucP\nl6dsEdSj82CBw9Xd7GQIsD7qYIzE18LKe9I+SroxHhDDpBuwTZREV9kOwyvOcvbD\nbp46+ymA7TGIRoScz6L7e8QSCqEPg/z6FBWtsCNpVx+AUF68Ci99IBU0xWKHyPRp\n6ZHpW9ET4150Q3ZFQLcw7xD8pt9lCb7YGbmWcZWYvMysLRZ4ihuYCbbaBzgtTp3i\nQQGmrZ2gcQVwdx898/OcJ8Kj9PNJEyoydoqcIQtVyQtfKev+Ofegy6pfH69i5+Z3\nOqs2Ochr3tVnzPAMIVsvW/eVtnXacyxUsyT+m2uhRtC+e72zlDmobpLPm7RPYGJA\nkQIDAQAB\n-----END PUBLIC KEY-----\n'
  },
  privateKey: {
    type: 'sec:Key',
    owner: authorityId,
    label: 'Key 1',
    publicKey: authorityId + '/keys/1',
    privateKeyPem: '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEAqMbYknpvLLx6+ZQ3IucPl6dsEdSj82CBw9Xd7GQIsD7qYIzE\n18LKe9I+SroxHhDDpBuwTZREV9kOwyvOcvbDbp46+ymA7TGIRoScz6L7e8QSCqEP\ng/z6FBWtsCNpVx+AUF68Ci99IBU0xWKHyPRp6ZHpW9ET4150Q3ZFQLcw7xD8pt9l\nCb7YGbmWcZWYvMysLRZ4ihuYCbbaBzgtTp3iQQGmrZ2gcQVwdx898/OcJ8Kj9PNJ\nEyoydoqcIQtVyQtfKev+Ofegy6pfH69i5+Z3Oqs2Ochr3tVnzPAMIVsvW/eVtnXa\ncyxUsyT+m2uhRtC+e72zlDmobpLPm7RPYGJAkQIDAQABAoIBAFBxFeAawspLu0Eh\nR3Y3MtNRVMza0Jm7MZ4pXPDCbPGzyvnhniBIE0IY3t+3BpoR221oVQtk034bUlHr\nmyZoPpWGjQ4QpgZnSVBy/Fpqj/pZZU/zm/WIqZjRDEubVSXVOc8UmAMyxyx3bwN1\nBsrc024jwVmluRjxd/B/elpx9by7Ub50tJgdrUMJU5QuzPKXublnUVZFH9czg3ck\noDbZCEkKL1yvCqxbD0EOZl/C/Rfw/jFT4bCDHu5h8JQSuBZ7Rpj1CThbA3LYsESj\nax4CQ57jWIkqcwXKvy74mY9uxPxR6S7JQt1uA0NPfcGPFcnODNDJkpFu395RsUVB\nhXptMAECgYEA1JKzGUwksqNP2cnfbHXnOflpXUCorbnaPjGKysZU7dqSe/ygxGUP\ngQyJS2Mbvlcx1MkobEZtuw6ESjhuTwmKaZ4g+KhhdH/D0izca4m5DamirFBwkhfy\nXxNa1j6VVcLMDJB0FdkSaqGgq/6e0L391O4l+KaC4L5W+F4MwKWU68ECgYEAy0Gn\nw2QFbsqksQmlk134QsGNFpYCUn4fmD1V3EJAPdliBIJAsTRmezvKkYLmQEUXTJQf\nasdBPanpJuGaiJcnSigBbFS9csOWzCzq5k8mz0giFMZW7mUuEM7ktENISfO5kiAN\nnyzDhrndvsEEnbbJWeBIqePE3a0CHSRjk51fyNECgYBi/yLrgBuDGi1g1vP3Nf2G\ncVIRfMBRj8FEv5vMjYsV7nnTxjY04H/U8Lqr4i8UeNUbLMdnjXEi8ULIsfklU+Mj\nBuKCCyC/uZS/t+a7KjuFUmAQ8bFLSF22y3O9XQ39D6gpnciCOEKsaDNEhmL+Ac1J\nsdL7Nsiy09H6/wnfWf29wQKBgCTZ0HrCZaHCp71ZTGW9gcdIpDXWGLGwIDZP2INI\nl7Ee+oBqxSPbpkDthDqBixFX9XNy34dSfOebKKRd/tCI5xywyCFF89sczvhRpH0B\nGL44C8XMd/Jc8c8mU5zDHhYaVCjEGvQi/4grpqJxCE831qWu3j2/B/BQ77Ms58jZ\nnYYhAoGBAIQFLVpI6HLah+ETKpH5+/SPqBE5D9YPATGIjczU/WVKyclnVzlEmE2I\n4Ddv5Usp7KQdDaM/ZZ4Ict3mXJf9Sf/JxqMfex7rHD2s3zHm52LZEmqwk9Cx3hFV\njQZJvKo6cWiuyPAZFh1TNZsQUaLnXNLJUWdIjXqKI4aQ9fdTi5E+\n-----END RSA PRIVATE KEY-----\n'
  }
});

// accounts
// fees first so auto-deposit has a fee account to work with
config.financial.accounts.push({
  id: baseUri + '/i/authority/accounts/fees',
  type: 'com:Account',
  owner: authorityId,
  psaSlug: 'fees',
  label: config.authority.name + ' Fees Account',
  psaPublic: ['label', 'owner'],
  currency: 'USD'
});
config.financial.accounts.push({
  id: baseUri + '/i/authority/accounts/main',
  type: 'com:Account',
  owner: authorityId,
  psaSlug: 'main',
  label: config.authority.name + ' Main Account',
  currency: 'USD'
});
config.financial.accounts.push({
  id: baseUri + '/i/authority/accounts/verify',
  type: 'com:Account',
  owner: authorityId,
  psaSlug: 'verify',
  label: config.authority.name + ' Verify Source Account',
  currency: 'USD'
});
config.financial.accounts.push({
  id: baseUri + '/i/dev/accounts/primary',
  type: 'com:Account',
  owner: baseUri + '/i/dev',
  psaSlug: 'primary',
  label: 'Primary Account',
  currency: 'USD'
});
config.financial.accounts.push({
  id: baseUri + '/i/customer/accounts/primary',
  type: 'com:Account',
  owner: baseUri + '/i/customer',
  psaSlug: 'primary',
  label: 'Primary Account',
  currency: 'USD'
});
config.financial.accounts.push({
  id: baseUri + '/i/vendor/accounts/primary',
  type: 'com:Account',
  owner: baseUri + '/i/vendor',
  psaSlug: 'primary',
  label: 'Primary Account',
  psaPublic: ['label', 'owner'],
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
  type: 'com:PayeeScheme',
  payee: [{
    type: 'com:Payee',
    destination: authorityId + '/accounts/main',
    payeeGroup: ['authority'],
    payeeRate: '2.00',
    payeeRateType: 'com:Percent',
    payeeApplyType: 'com:Inclusive',
    comment: config.authority.name + ' Processing'
  }],
  psaMinimumAmounts: {}
};
// minimum amounts for default payee scheme
defaultPayeeScheme.psaMinimumAmounts[
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

// BankAccount fees
config.financial.paymentGateway.Test.payees.deposit['bank:BankAccount'] = [{
  type: 'com:Payee',
  destination: baseUri + '/i/authority/accounts/fees',
  payeeGroup: ['authority'],
  payeeApplyGroup: ['authority_gateway'],
  payeeExemptGroup: [
    'authority', 'authority_gatewayPercentExempt', 'authority_exempt'],
  payeeRateType: 'com:Percent',
  // 1 / (1 - inclusive rate of 0.0099)
  payeeRate: '0.9998990',
  payeeApplyType: 'com:Exclusive',
  comment: 'Bank Deposit Processing Service (Percentage Charge)'
}, {
  type: 'com:Payee',
  destination: baseUri + '/i/authority/accounts/fees',
  payeeGroup: ['authority'],
  payeeApplyGroup: ['authority_gateway'],
  payeeExemptGroup: [
    'authority', 'authority_gatewayFlatExempt', 'authority_exempt'],
  payeeRateType: 'com:FlatAmount',
  payeeRate: '0.50',
  payeeApplyType: 'com:Exclusive',
  comment: 'Bank Deposit Processing Service (Fixed Charge)'
}];
config.financial.paymentGateway.Test.payees.withdrawal['bank:BankAccount'] = [{
  type: 'com:Payee',
  destination: baseUri + '/i/authority/accounts/fees',
  payeeGroup: ['authority', 'authority_percent'],
  payeeApplyGroup: ['authority_gateway'],
  payeeApplyAfter: ['authority_flat'],
  payeeExemptGroup: [
    'authority', 'authority_gatewayPercentExempt', 'authority_exempt'],
  payeeRateType: 'com:Percent',
  payeeRate: '0.99',
  payeeApplyType: 'com:Inclusive',
  comment: 'Bank Withdrawal Processing Service (Percentage Charge)'
}, {
  type: 'com:Payee',
  destination: baseUri + '/i/authority/accounts/fees',
  payeeGroup: ['authority', 'authority_flat'],
  payeeApplyGroup: ['authority_gateway'],
  payeeExemptGroup: [
    'authority', 'authority_gatewayFlatExempt', 'authority_exempt'],
  payeeRateType: 'com:FlatAmount',
  payeeRate: '0.50',
  payeeApplyType: 'com:Inclusive',
  comment: 'Bank Withdrawal Processing Service (Fixed Charge)'
}];

// CreditCard fees
var ccPercentPayee = {
  type: 'com:Payee',
  destination: baseUri + '/i/authority/accounts/fees',
  payeeGroup: ['authority'],
  payeeApplyGroup: ['authority_gateway'],
  payeeExemptGroup: [
    'authority', 'authority_gatewayPercentExempt', 'authority_exempt'],
  payeeRateType: 'com:Percent',
  // 1 / (1 - inclusive rate of 0.0214)
  payeeRate: '2.1867975',
  payeeApplyType: 'com:Exclusive',
  comment: 'Credit Card Deposit Processing Service (Percentage Charge)'
};
var ccFixedPayee = {
  type: 'com:Payee',
  destination: baseUri + '/i/authority/accounts/fees',
  payeeGroup: ['authority'],
  payeeApplyGroup: ['authority_gateway'],
  payeeExemptGroup: [
    'authority', 'authority_gatewayFlatExempt', 'authority_exempt'],
  payeeRateType: 'com:FlatAmount',
  payeeRate: '0.15',
  payeeApplyType: 'com:Exclusive',
  comment: 'Credit Card Deposit Processing Service (Fixed Charge)'
};
// extra 0.15 for amex
var ccAmexPayee = {
  type: 'com:Payee',
  destination: baseUri + '/i/authority/accounts/fees',
  payeeGroup: ['authority'],
  payeeApplyGroup: ['authority_gateway'],
  payeeExemptGroup: [
    'authority', 'authority_gatewayFlatExempt', 'authority_exempt'],
  payeeRateType: 'com:FlatAmount',
  payeeRate: '0.15',
  payeeApplyType: 'com:Exclusive',
  comment: 'Credit Card Deposit Processing Service (American Express Fixed Charge)'
};
config.financial.paymentGateway.Test.payees.deposit
  ['ccard:CreditCard'] = {};
config.financial.paymentGateway.Test.payees.deposit
  ['ccard:CreditCard']['default'] = [
  ccPercentPayee,
  ccFixedPayee
];
config.financial.paymentGateway.Test.payees.deposit
  ['ccard:CreditCard']['ccard:AmericanExpress'] = [
  ccPercentPayee,
  ccFixedPayee,
  ccAmexPayee,
];

// set bank account settlement to happen immediately
config.financial.paymentGateway.Test.bankAccountSettlement = 0;
