var config = require('../lib/payswarm-auth').config;

config.permission.roles.push({
  '@id': config.authority.baseUri + '/roles/profile_administrator',
  '@type': 'psa:Role',
  'rdfs:label': 'Profile Administrator',
  'rdfs:comment': 'Role for profile administrators.',
  'psa:permission': [
    {'@id': 'https://payswarm.com/modules/profile#profile_admin'},
    {'@id': 'https://payswarm.com/modules/profile#profile_access'},
    {'@id': 'https://payswarm.com/modules/profile#profile_create'},
    {'@id': 'https://payswarm.com/modules/profile#profile_edit'},
    {'@id': 'https://payswarm.com/modules/profile#profile_remove'},
    {'@id': 'https://payswarm.com/modules/profile#public_key_create'},
    {'@id': 'https://payswarm.com/modules/profile#public_key_remove'}
  ]
});
config.permission.roles.push({
  '@id': config.authority.baseUri + '/roles/profile_registered',
  '@type': 'psa:Role',
  'rdfs:label': 'Registered Profile',
  'rdfs:comment': 'Role for registered profiles.',
  'psa:permission': [
    {'@id': 'https://payswarm.com/modules/profile#profile_access'},
    {'@id': 'https://payswarm.com/modules/profile#profile_create'},
    {'@id': 'https://payswarm.com/modules/profile#profile_edit'},
    {'@id': 'https://payswarm.com/modules/profile#public_key_create'}
  ]
});
config.permission.roles.push({
  '@id': config.authority.baseUri + '/roles/role_administrator',
  '@type': 'psa:Role',
  'rdfs:label': 'Role Administrator',
  'rdfs:comment': 'This role is used to administer Roles and Permissions.',
  'psa:permission': [
    {'@id': 'https://payswarm.com/modules/permission#role_admin'},
    {'@id': 'https://payswarm.com/modules/permission#role_create'},
    {'@id': 'https://payswarm.com/modules/permission#role_edit'},
    {'@id': 'https://payswarm.com/modules/permission#role_remove'}
  ]
});
config.permission.roles.push({
  '@id': config.authority.baseUri + '/roles/identity_administrator',
  '@type': 'psa:Role',
  'rdfs:label': 'Identity Administrator',
  'rdfs:comment': 'Role for Identity administrators.',
  'psa:permission': [
    {'@id': 'https://payswarm.com/modules/identity#identity_admin'},
    {'@id': 'https://payswarm.com/modules/identity#identity_access'},
    {'@id': 'https://payswarm.com/modules/identity#identity_create'},
    {'@id': 'https://payswarm.com/modules/identity#identity_edit'},
    {'@id': 'https://payswarm.com/modules/identity#identity_remove'},
    {'@id': 'https://payswarm.com/modules/identity#public_key_create'},
    {'@id': 'https://payswarm.com/modules/identity#public_key_remove'},
    {'@id': 'https://payswarm.com/modules/address-validator#address_validator_admin'},
    {'@id': 'https://payswarm.com/modules/address-validator#address_validator_access'}
  ]
});
config.permission.roles.push({
  '@id': config.authority.baseUri + '/roles/identity_manager',
  '@type': 'psa:Role',
  'rdfs:label': 'Identity Manager',
  'rdfs:comment': 'Role for identity managers.',
  'psa:permission': [
    {'@id': 'https://payswarm.com/modules/identity#identity_access'},
    {'@id': 'https://payswarm.com/modules/identity#identity_create'},
    {'@id': 'https://payswarm.com/modules/identity#identity_edit'},
    {'@id': 'https://payswarm.com/modules/identity#public_key_create'},
    {'@id': 'https://payswarm.com/modules/address-validator#address_validator_access'}
  ]
});
config.permission.roles.push({
  '@id': config.authority.baseUri + '/roles/financial_administrator',
  '@type': 'psa:Role',
  'rdfs:label': 'Financial Administrator',
  'rdfs:comment': 'Role for financial administrators.',
  'psa:permission': [
    {'@id': 'https://payswarm.com/modules/financial#account_admin'},
    {'@id': 'https://payswarm.com/modules/financial#account_access'},
    {'@id': 'https://payswarm.com/modules/financial#account_create'},
    {'@id': 'https://payswarm.com/modules/financial#account_edit'},
    {'@id': 'https://payswarm.com/modules/financial#account_remove'},
    {'@id': 'https://payswarm.com/modules/financial#budget_admin'},
    {'@id': 'https://payswarm.com/modules/financial#budget_access'},
    {'@id': 'https://payswarm.com/modules/financial#budget_create'},
    {'@id': 'https://payswarm.com/modules/financial#budget_edit'},
    {'@id': 'https://payswarm.com/modules/financial#budget_remove'},
    {'@id': 'https://payswarm.com/modules/financial#payment_token_admin'},
    {'@id': 'https://payswarm.com/modules/financial#payment_token_access'},
    {'@id': 'https://payswarm.com/modules/financial#payment_token_create'},
    {'@id': 'https://payswarm.com/modules/financial#payment_token_edit'},
    {'@id': 'https://payswarm.com/modules/financial#payment_token_remove'}
  ]
});
config.permission.roles.push({
  '@id': config.authority.baseUri + '/roles/financial_manager',
  '@type': 'psa:Role',
  'rdfs:label': 'Financial Manager',
  'rdfs:comment': 'Role for financial managers.',
  'psa:permission': [
    {'@id': 'https://payswarm.com/modules/financial#account_access'},
    {'@id': 'https://payswarm.com/modules/financial#account_create'},
    {'@id': 'https://payswarm.com/modules/financial#account_edit'},
    {'@id': 'https://payswarm.com/modules/financial#budget_access'},
    {'@id': 'https://payswarm.com/modules/financial#budget_create'},
    {'@id': 'https://payswarm.com/modules/financial#budget_edit'},
    {'@id': 'https://payswarm.com/modules/financial#budget_remove'},
    {'@id': 'https://payswarm.com/modules/financial#payment_token_access'},
    {'@id': 'https://payswarm.com/modules/financial#payment_token_create'},
    {'@id': 'https://payswarm.com/modules/financial#payment_token_edit'},
    {'@id': 'https://payswarm.com/modules/financial#payment_token_remove'}
  ]
});
config.permission.roles.push({
  '@id': config.authority.baseUri + '/roles/website_administrator',
  '@type': 'psa:Role',
  'rdfs:label': 'Website Administrator',
  'rdfs:comment': 'This role is used to administer the PaySwarm website.',
  'psa:permission': [
    {'@id': 'https://payswarm.com/modules/website#admin'}
  ]
});
