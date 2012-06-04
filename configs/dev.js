var config = require('../payswarm.config');
var baseUri = config.authority.baseUri;
var authorityId = config.authority.id;

// test address validator
config.addressValidator.test = {};
config.addressValidator.test.key = 'testhashkey';
config.addressValidator.test.address = {
  'vcard:fn': 'Full Name',
  'vcard:street-address': '100 Street Apt 1',
  'vcard:locality': 'City',
  'vcard:region': 'State',
  'vcard:postal-code': '10000',
  'vcard:country-name': 'US'
};

// financial defaults
config.financial.defaults.account = {
  '@type': 'Account',
  // demo with $10
  'com:balance': '10.0000000',
  'com:escrow': '0.0000000',
  'com:currency': 'USD',
  'psa:status': 'active',
  'psa:privacy': 'private'
};
config.financial.defaults.paymentTokens.push({
  // demo payment token source
  '@type': 'ccard:CreditCard',
  'rdfs:label': 'My Visa',
  'com:gateway': 'Test',
  'ccard:brand': 'ccard:Visa',
  'ccard:number': '4111111111111111',
  'ccard:expMonth': '11',
  'ccard:expYear': '16',
  'ccard:cvm': '111',
  'ccard:address': {
    'vcard:fn': 'Billing Name',
    'vcard:street-address': '1 Billing Lane',
    'vcard:locality': 'Locality',
    'vcard:region': 'Region',
    'vcard:postal-code': '12345',
    'vcard:country-name': 'US'
  }
});

// profiles
config.profile.profiles.push({
  '@id': baseUri + '/profiles/authority',
  '@type': 'ps:Profile',
  'psa:slug': 'authority',
  'foaf:mbox': 'authority@payswarm.com',
  'rdfs:label': 'PaySwarm Development Authority',
  'psa:password': 'password',
  'psa:role': [
    baseUri + '/roles/financial_administrator',
    baseUri + '/roles/identity_administrator',
    baseUri + '/roles/role_administrator',
    baseUri + '/roles/system_administrator',
    baseUri + '/roles/profile_administrator'
  ]
});
config.profile.profiles.push({
  '@id': baseUri + '/profiles/dev',
  '@type': 'ps:Profile',
  'psa:slug': 'dev',
  'foaf:mbox': 'dev@payswarm.com',
  'rdfs:label': 'Dev',
  'psa:password': 'password',
  'psa:role': [
    baseUri + '/roles/profile_registered',
    baseUri + '/roles/identity_manager',
    baseUri + '/roles/financial_manager']
});
config.profile.profiles.push({
  '@id': baseUri + '/profiles/customer',
  '@type': 'ps:Profile',
  'psa:slug': 'customer',
  'foaf:mbox': 'customer@payswarm.com',
  'rdfs:label': 'Customer',
  'psa:password': 'password',
  'psa:role': [
    baseUri + '/roles/profile_registered',
    baseUri + '/roles/identity_manager',
    baseUri + '/roles/financial_manager']
});
config.profile.profiles.push({
  '@id': baseUri + '/profiles/vendor',
  '@type': 'ps:Profile',
  'psa:slug': 'vendor',
  'foaf:mbox': 'vendor@payswarm.com',
  'rdfs:label': 'Vendor',
  'psa:password': 'password',
  'psa:role': [
    baseUri + '/roles/profile_registered',
    baseUri + '/roles/identity_manager',
    baseUri + '/roles/financial_manager'
 ]
});

// identities
config.identity.identities.push({
  '@id': authorityId,
  'ps:owner': baseUri + '/profiles/authority',
  'psa:slug': 'authority',
  'rdfs:label': 'PaySwarm Authority'
});
config.identity.identities.push({
  '@id': baseUri + '/i/dev',
  '@type': 'ps:PersonalIdentity',
  'ps:owner': baseUri + '/profiles/dev',
  'psa:slug': 'dev',
  'rdfs:label': 'Dev'
});
config.identity.identities.push({
  '@id': baseUri + '/i/customer',
  '@type': 'ps:PersonalIdentity',
  'ps:owner': baseUri + '/profiles/customer',
  'psa:slug': 'customer',
  'rdfs:label': 'Customer'
});
config.identity.identities.push({
  '@id': baseUri + '/i/vendor',
  '@type': 'ps:VendorIdentity',
  'ps:owner': baseUri + '/profiles/vendor',
  'psa:slug': 'vendor',
  'rdfs:label': 'Vendor',
  'foaf:homepage': 'http://example.com/vendor',
  'dc:description': 'The default PaySwarm Vendor'
});

// keys
config.identity.keys.push({
  publicKey: {
    '@id': authorityId + '/keys/1',
    '@type': 'sec:Key',
    'ps:owner': authorityId,
    'rdfs:label': 'Key 1',
    'sec:publicKeyPem': '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqMbYknpvLLx6+ZQ3IucP\nl6dsEdSj82CBw9Xd7GQIsD7qYIzE18LKe9I+SroxHhDDpBuwTZREV9kOwyvOcvbD\nbp46+ymA7TGIRoScz6L7e8QSCqEPg/z6FBWtsCNpVx+AUF68Ci99IBU0xWKHyPRp\n6ZHpW9ET4150Q3ZFQLcw7xD8pt9lCb7YGbmWcZWYvMysLRZ4ihuYCbbaBzgtTp3i\nQQGmrZ2gcQVwdx898/OcJ8Kj9PNJEyoydoqcIQtVyQtfKev+Ofegy6pfH69i5+Z3\nOqs2Ochr3tVnzPAMIVsvW/eVtnXacyxUsyT+m2uhRtC+e72zlDmobpLPm7RPYGJA\nkQIDAQAB\n-----END PUBLIC KEY-----\n'
  },
  privateKey: {
    '@type': 'sec:Key',
    'ps:owner': authorityId,
    'rdfs:label': 'Key 1',
    'sec:publicKey': authorityId + '/keys/1',
    'sec:privateKeyPem': '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEAqMbYknpvLLx6+ZQ3IucPl6dsEdSj82CBw9Xd7GQIsD7qYIzE\n18LKe9I+SroxHhDDpBuwTZREV9kOwyvOcvbDbp46+ymA7TGIRoScz6L7e8QSCqEP\ng/z6FBWtsCNpVx+AUF68Ci99IBU0xWKHyPRp6ZHpW9ET4150Q3ZFQLcw7xD8pt9l\nCb7YGbmWcZWYvMysLRZ4ihuYCbbaBzgtTp3iQQGmrZ2gcQVwdx898/OcJ8Kj9PNJ\nEyoydoqcIQtVyQtfKev+Ofegy6pfH69i5+Z3Oqs2Ochr3tVnzPAMIVsvW/eVtnXa\ncyxUsyT+m2uhRtC+e72zlDmobpLPm7RPYGJAkQIDAQABAoIBAFBxFeAawspLu0Eh\nR3Y3MtNRVMza0Jm7MZ4pXPDCbPGzyvnhniBIE0IY3t+3BpoR221oVQtk034bUlHr\nmyZoPpWGjQ4QpgZnSVBy/Fpqj/pZZU/zm/WIqZjRDEubVSXVOc8UmAMyxyx3bwN1\nBsrc024jwVmluRjxd/B/elpx9by7Ub50tJgdrUMJU5QuzPKXublnUVZFH9czg3ck\noDbZCEkKL1yvCqxbD0EOZl/C/Rfw/jFT4bCDHu5h8JQSuBZ7Rpj1CThbA3LYsESj\nax4CQ57jWIkqcwXKvy74mY9uxPxR6S7JQt1uA0NPfcGPFcnODNDJkpFu395RsUVB\nhXptMAECgYEA1JKzGUwksqNP2cnfbHXnOflpXUCorbnaPjGKysZU7dqSe/ygxGUP\ngQyJS2Mbvlcx1MkobEZtuw6ESjhuTwmKaZ4g+KhhdH/D0izca4m5DamirFBwkhfy\nXxNa1j6VVcLMDJB0FdkSaqGgq/6e0L391O4l+KaC4L5W+F4MwKWU68ECgYEAy0Gn\nw2QFbsqksQmlk134QsGNFpYCUn4fmD1V3EJAPdliBIJAsTRmezvKkYLmQEUXTJQf\nasdBPanpJuGaiJcnSigBbFS9csOWzCzq5k8mz0giFMZW7mUuEM7ktENISfO5kiAN\nnyzDhrndvsEEnbbJWeBIqePE3a0CHSRjk51fyNECgYBi/yLrgBuDGi1g1vP3Nf2G\ncVIRfMBRj8FEv5vMjYsV7nnTxjY04H/U8Lqr4i8UeNUbLMdnjXEi8ULIsfklU+Mj\nBuKCCyC/uZS/t+a7KjuFUmAQ8bFLSF22y3O9XQ39D6gpnciCOEKsaDNEhmL+Ac1J\nsdL7Nsiy09H6/wnfWf29wQKBgCTZ0HrCZaHCp71ZTGW9gcdIpDXWGLGwIDZP2INI\nl7Ee+oBqxSPbpkDthDqBixFX9XNy34dSfOebKKRd/tCI5xywyCFF89sczvhRpH0B\nGL44C8XMd/Jc8c8mU5zDHhYaVCjEGvQi/4grpqJxCE831qWu3j2/B/BQ77Ms58jZ\nnYYhAoGBAIQFLVpI6HLah+ETKpH5+/SPqBE5D9YPATGIjczU/WVKyclnVzlEmE2I\n4Ddv5Usp7KQdDaM/ZZ4Ict3mXJf9Sf/JxqMfex7rHD2s3zHm52LZEmqwk9Cx3hFV\njQZJvKo6cWiuyPAZFh1TNZsQUaLnXNLJUWdIjXqKI4aQ9fdTi5E+\n-----END RSA PRIVATE KEY-----\n'
  }
});

// accounts
config.financial.accounts.push({
  '@id': baseUri + '/i/authority/accounts/main',
  '@type': 'com:Account',
  'ps:owner': authorityId,
  'psa:slug': 'main',
  'rdfs:label': config.authority.name + ' Main Account',
  'com:currency': 'USD'
});
config.financial.accounts.push({
  '@id': baseUri + '/i/authority/accounts/escrow',
  '@type': 'com:Account',
  'ps:owner': authorityId,
  'psa:slug': 'escrow',
  'rdfs:label': config.authority.name + ' Escrow Account',
  'com:currency': 'USD'
});
config.financial.accounts.push({
  '@id': baseUri + '/i/authority/accounts/fees',
  '@type': 'com:Account',
  'ps:owner': authorityId,
  'psa:slug': 'fees',
  'rdfs:label': config.authority.name + ' Fees Account',
  'com:currency': 'USD'
});
config.financial.accounts.push({
  '@id': baseUri + '/i/dev/accounts/primary',
  '@type': 'com:Account',
  'ps:owner': baseUri + '/i/dev',
  'psa:slug': 'primary',
  'rdfs:label': 'Primary Account',
  'com:currency': 'USD'
});
config.financial.accounts.push({
  '@id': baseUri + '/i/customer/accounts/primary',
  '@type': 'com:Account',
  'ps:owner': baseUri + '/i/customer',
  'psa:slug': 'primary',
  'rdfs:label': 'Primary Account',
  'com:currency': 'USD'
});
config.financial.accounts.push({
  '@id': baseUri + '/i/vendor/accounts/primary',
  '@type': 'com:Account',
  'ps:owner': baseUri + '/i/vendor',
  'psa:slug': 'primary',
  'rdfs:label': 'Primary Account',
  'com:currency': 'USD'
});

// payee schemes
var defaultPayeeSchemeId = authorityId + '/payee-schemes/default';
var defaultPayeeScheme = {
  '@id': defaultPayeeSchemeId,
  '@type': 'com:PayeeScheme',
  'com:payee': [{
    '@type': 'com:Payee',
    'com:rate': '2.00',
    'com:rateType': 'com:Percentage',
    'com:destination': authorityId + '/accounts/main',
    'rdfs:comment': config.authority.name + ' Processing',
    'com:rateContext': ['com:Inclusive', 'com:TaxExempt']
  }],
  'psa:mininumAmounts': {}
};
// minimum amounts for default payee scheme
defaultPayeeScheme['psa:mininumAmounts'][
  authorityId + '/accounts/main'] = '0.0002';
config.financial.payeeSchemes[defaultPayeeSchemeId] = defaultPayeeScheme;

// gateways
config.financial.paymentGateways.push('./payswarm.pg.test');
config.financial.paymentGateway = config.financial.paymentGateway || {};
config.financial.paymentGateway.Test = {};
config.financial.paymentGateway.Test['com:payee'] = [{
  '@type': 'com:Payee',
  'com:destination': baseUri + '/i/authority/accounts/fees',
  'com:rateType': 'com:Percentage',
  'com:rate': '4.1666667',
  'com:rateContext': 'com:Exclusive',
  'rdfs:comment': 'Deposit Processing Service'
}];
