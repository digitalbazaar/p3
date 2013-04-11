var config = require(__libdir + '/payswarm-auth').config;

config.permission.roles.push({
  id: config.authority.baseUri + '/roles/profile_administrator',
  type: 'psa:Role',
  label: 'Profile Administrator',
  comment: 'Role for profile administrators.',
  psaPermission: [
    {id: 'https://payswarm.com/modules/profile#profile_admin'},
    {id: 'https://payswarm.com/modules/profile#profile_access'},
    {id: 'https://payswarm.com/modules/profile#profile_create'},
    {id: 'https://payswarm.com/modules/profile#profile_edit'},
    {id: 'https://payswarm.com/modules/profile#profile_remove'}
  ]
});
config.permission.roles.push({
  id: config.authority.baseUri + '/roles/profile_manager',
  type: 'psa:Role',
  label: 'Registered Profile',
  comment: 'Role for registered profiles.',
  psaPermission: [
    {id: 'https://payswarm.com/modules/profile#profile_access'},
    {id: 'https://payswarm.com/modules/profile#profile_create'},
    {id: 'https://payswarm.com/modules/profile#profile_edit'},
    {id: 'https://payswarm.com/modules/promo#promo_redeem_code'}
  ]
});
config.permission.roles.push({
  id: config.authority.baseUri + '/roles/role_administrator',
  type: 'psa:Role',
  label: 'Role Administrator',
  comment: 'This role is used to administer Roles and Permissions.',
  psaPermission: [
    {id: 'https://payswarm.com/modules/permission#role_admin'},
    {id: 'https://payswarm.com/modules/permission#role_create'},
    {id: 'https://payswarm.com/modules/permission#role_edit'},
    {id: 'https://payswarm.com/modules/permission#role_remove'}
  ]
});
config.permission.roles.push({
  id: config.authority.baseUri + '/roles/identity_administrator',
  type: 'psa:Role',
  label: 'Identity Administrator',
  comment: 'Role for Identity administrators.',
  psaPermission: [
    {id: 'https://payswarm.com/modules/identity#identity_admin'},
    {id: 'https://payswarm.com/modules/identity#identity_access'},
    {id: 'https://payswarm.com/modules/identity#identity_create'},
    {id: 'https://payswarm.com/modules/identity#identity_edit'},
    {id: 'https://payswarm.com/modules/identity#identity_remove'},
    {id: 'https://payswarm.com/modules/identity#public_key_create'},
    {id: 'https://payswarm.com/modules/identity#public_key_remove'},
    {id: 'https://payswarm.com/modules/address-validator#address_validator_admin'},
    {id: 'https://payswarm.com/modules/address-validator#address_validator_access'}
  ]
});
config.permission.roles.push({
  id: config.authority.baseUri + '/roles/identity_manager',
  type: 'psa:Role',
  label: 'Identity Manager',
  comment: 'Role for identity managers.',
  psaPermission: [
    {id: 'https://payswarm.com/modules/identity#identity_access'},
    {id: 'https://payswarm.com/modules/identity#identity_create'},
    {id: 'https://payswarm.com/modules/identity#identity_edit'},
    {id: 'https://payswarm.com/modules/identity#public_key_create'},
    {id: 'https://payswarm.com/modules/identity#public_key_remove'},
    {id: 'https://payswarm.com/modules/address-validator#address_validator_access'}
  ]
});
config.permission.roles.push({
  id: config.authority.baseUri + '/roles/financial_administrator',
  type: 'psa:Role',
  label: 'Financial Administrator',
  comment: 'Role for financial administrators.',
  psaPermission: [
    {id: 'https://payswarm.com/modules/financial#account_admin'},
    {id: 'https://payswarm.com/modules/financial#account_access'},
    {id: 'https://payswarm.com/modules/financial#account_create'},
    {id: 'https://payswarm.com/modules/financial#account_edit'},
    {id: 'https://payswarm.com/modules/financial#account_remove'},
    {id: 'https://payswarm.com/modules/financial#budget_admin'},
    {id: 'https://payswarm.com/modules/financial#budget_access'},
    {id: 'https://payswarm.com/modules/financial#budget_create'},
    {id: 'https://payswarm.com/modules/financial#budget_edit'},
    {id: 'https://payswarm.com/modules/financial#budget_remove'},
    {id: 'https://payswarm.com/modules/financial#payment_token_admin'},
    {id: 'https://payswarm.com/modules/financial#payment_token_access'},
    {id: 'https://payswarm.com/modules/financial#payment_token_create'},
    {id: 'https://payswarm.com/modules/financial#payment_token_edit'},
    {id: 'https://payswarm.com/modules/financial#payment_token_remove'},
    {id: 'https://payswarm.com/modules/financial#transaction_admin'},
    {id: 'https://payswarm.com/modules/financial#transaction_access'},
    {id: 'https://payswarm.com/modules/financial#transaction_create'}
  ]
});
config.permission.roles.push({
  id: config.authority.baseUri + '/roles/financial_manager',
  type: 'psa:Role',
  label: 'Financial Manager',
  comment: 'Role for financial managers.',
  psaPermission: [
    {id: 'https://payswarm.com/modules/financial#account_access'},
    {id: 'https://payswarm.com/modules/financial#account_create'},
    {id: 'https://payswarm.com/modules/financial#account_edit'},
    {id: 'https://payswarm.com/modules/financial#budget_access'},
    {id: 'https://payswarm.com/modules/financial#budget_create'},
    {id: 'https://payswarm.com/modules/financial#budget_edit'},
    {id: 'https://payswarm.com/modules/financial#budget_remove'},
    {id: 'https://payswarm.com/modules/financial#payment_token_access'},
    {id: 'https://payswarm.com/modules/financial#payment_token_create'},
    {id: 'https://payswarm.com/modules/financial#payment_token_edit'},
    {id: 'https://payswarm.com/modules/financial#payment_token_remove'},
    {id: 'https://payswarm.com/modules/financial#transaction_access'},
    {id: 'https://payswarm.com/modules/financial#transaction_create'}
  ]
});
config.permission.roles.push({
  id: config.authority.baseUri + '/roles/website_administrator',
  type: 'psa:Role',
  label: 'Website Administrator',
  comment: 'This role is used to administer the PaySwarm website.',
  psaPermission: [
    {id: 'https://payswarm.com/modules/website#admin'}
  ]
});
config.permission.roles.push({
  id: config.authority.baseUri + '/roles/promo_administrator',
  type: 'psa:Role',
  label: 'Promotional Code Administrator',
  comment: 'Role for Promotional Code administrators.',
  psaPermission: [
    {id: 'https://payswarm.com/modules/promo#promo_admin'},
    {id: 'https://payswarm.com/modules/promo#promo_access'},
    {id: 'https://payswarm.com/modules/promo#promo_create'},
    {id: 'https://payswarm.com/modules/promo#promo_edit'},
    {id: 'https://payswarm.com/modules/promo#promo_remove'},
    {id: 'https://payswarm.com/modules/promo#promo_redeem_code'}
  ]
});
config.permission.roles.push({
  id: config.authority.baseUri + '/roles/promo_manager',
  type: 'psa:Role',
  label: 'Promotional Code Manager',
  comment: 'Role for Promotional Code managers.',
  psaPermission: [
    {id: 'https://payswarm.com/modules/promo#promo_access'},
    {id: 'https://payswarm.com/modules/promo#promo_create'},
    {id: 'https://payswarm.com/modules/promo#promo_edit'},
    {id: 'https://payswarm.com/modules/promo#promo_remove'},
    {id: 'https://payswarm.com/modules/promo#promo_redeem_code'}
  ]
});
config.permission.roles.push({
  id: config.authority.baseUri + '/roles/hosted_administrator',
  type: 'psa:Role',
  label: 'Hosted Assets/Listings Administrator',
  comment: 'Role for Hosted Assets/Listings administrators.',
  psaPermission: [
    {id: 'https://payswarm.com/modules/hosted#asset_admin'},
    {id: 'https://payswarm.com/modules/hosted#asset_access'},
    {id: 'https://payswarm.com/modules/hosted#asset_create'},
    {id: 'https://payswarm.com/modules/hosted#asset_edit'},
    {id: 'https://payswarm.com/modules/hosted#asset_remove'},
    {id: 'https://payswarm.com/modules/hosted#listing_admin'},
    {id: 'https://payswarm.com/modules/hosted#listing_access'},
    {id: 'https://payswarm.com/modules/hosted#listing_create'},
    {id: 'https://payswarm.com/modules/hosted#listing_edit'},
    {id: 'https://payswarm.com/modules/hosted#listing_remove'}
  ]
});
config.permission.roles.push({
  id: config.authority.baseUri + '/roles/hosted_manager',
  type: 'psa:Role',
  label: 'Hosted Assets/Listings Manager',
  comment: 'Role for Hosted Assets/Listings managers.',
  psaPermission: [
    {id: 'https://payswarm.com/modules/hosted#asset_access'},
    {id: 'https://payswarm.com/modules/hosted#asset_create'},
    {id: 'https://payswarm.com/modules/hosted#asset_edit'},
    {id: 'https://payswarm.com/modules/hosted#asset_remove'},
    {id: 'https://payswarm.com/modules/hosted#listing_access'},
    {id: 'https://payswarm.com/modules/hosted#listing_create'},
    {id: 'https://payswarm.com/modules/hosted#listing_edit'},
    {id: 'https://payswarm.com/modules/hosted#listing_remove'}
  ]
});

// authority role contains all permissions
config.permission.roles.push({
  id: config.authority.baseUri + '/roles/authority',
  type: 'psa:Role',
  label: 'Authority',
  comment: 'Role for PaySwarm Authority.',
  psaPermission: [
    // profile permissions
    {id: 'https://payswarm.com/modules/profile#profile_admin'},
    {id: 'https://payswarm.com/modules/profile#profile_access'},
    {id: 'https://payswarm.com/modules/profile#profile_create'},
    {id: 'https://payswarm.com/modules/profile#profile_edit'},
    {id: 'https://payswarm.com/modules/profile#profile_remove'},
    // role permissions
    {id: 'https://payswarm.com/modules/permission#role_admin'},
    {id: 'https://payswarm.com/modules/permission#role_create'},
    {id: 'https://payswarm.com/modules/permission#role_edit'},
    {id: 'https://payswarm.com/modules/permission#role_remove'},
    // identity permissions
    {id: 'https://payswarm.com/modules/identity#identity_admin'},
    {id: 'https://payswarm.com/modules/identity#identity_access'},
    {id: 'https://payswarm.com/modules/identity#identity_create'},
    {id: 'https://payswarm.com/modules/identity#identity_edit'},
    {id: 'https://payswarm.com/modules/identity#identity_remove'},
    {id: 'https://payswarm.com/modules/identity#public_key_create'},
    {id: 'https://payswarm.com/modules/identity#public_key_remove'},
    {id: 'https://payswarm.com/modules/address-validator#address_validator_admin'},
    {id: 'https://payswarm.com/modules/address-validator#address_validator_access'},
    // financial permissions
    {id: 'https://payswarm.com/modules/financial#account_admin'},
    {id: 'https://payswarm.com/modules/financial#account_access'},
    {id: 'https://payswarm.com/modules/financial#account_create'},
    {id: 'https://payswarm.com/modules/financial#account_edit'},
    {id: 'https://payswarm.com/modules/financial#account_remove'},
    {id: 'https://payswarm.com/modules/financial#budget_admin'},
    {id: 'https://payswarm.com/modules/financial#budget_access'},
    {id: 'https://payswarm.com/modules/financial#budget_create'},
    {id: 'https://payswarm.com/modules/financial#budget_edit'},
    {id: 'https://payswarm.com/modules/financial#budget_remove'},
    {id: 'https://payswarm.com/modules/financial#payment_token_admin'},
    {id: 'https://payswarm.com/modules/financial#payment_token_access'},
    {id: 'https://payswarm.com/modules/financial#payment_token_create'},
    {id: 'https://payswarm.com/modules/financial#payment_token_edit'},
    {id: 'https://payswarm.com/modules/financial#payment_token_remove'},
    {id: 'https://payswarm.com/modules/financial#transaction_admin'},
    {id: 'https://payswarm.com/modules/financial#transaction_access'},
    {id: 'https://payswarm.com/modules/financial#transaction_create'},
    // website permissions
    {id: 'https://payswarm.com/modules/website#admin'},
    // promo permissions
    {id: 'https://payswarm.com/modules/promo#promo_admin'},
    {id: 'https://payswarm.com/modules/promo#promo_access'},
    {id: 'https://payswarm.com/modules/promo#promo_create'},
    {id: 'https://payswarm.com/modules/promo#promo_edit'},
    {id: 'https://payswarm.com/modules/promo#promo_remove'},
    {id: 'https://payswarm.com/modules/promo#promo_redeem_code'},
    // hosted permissions
    {id: 'https://payswarm.com/modules/hosted#asset_admin'},
    {id: 'https://payswarm.com/modules/hosted#asset_access'},
    {id: 'https://payswarm.com/modules/hosted#asset_create'},
    {id: 'https://payswarm.com/modules/hosted#asset_edit'},
    {id: 'https://payswarm.com/modules/hosted#asset_remove'},
    {id: 'https://payswarm.com/modules/hosted#listing_admin'},
    {id: 'https://payswarm.com/modules/hosted#listing_access'},
    {id: 'https://payswarm.com/modules/hosted#listing_create'},
    {id: 'https://payswarm.com/modules/hosted#listing_edit'},
    {id: 'https://payswarm.com/modules/hosted#listing_remove'}
  ]
});

// default registered profile role (contains all permissions for a regular
// profile)
config.permission.roles.push({
  id: config.authority.baseUri + '/roles/profile_registered',
  type: 'psa:Role',
  label: 'Registered Profile',
  comment: 'Role for registered profiles.',
  psaPermission: [
    // profile permissions
    {id: 'https://payswarm.com/modules/profile#profile_access'},
    {id: 'https://payswarm.com/modules/profile#profile_create'},
    {id: 'https://payswarm.com/modules/profile#profile_edit'},
    {id: 'https://payswarm.com/modules/promo#promo_redeem_code'},
    // identity permissions
    {id: 'https://payswarm.com/modules/identity#identity_access'},
    {id: 'https://payswarm.com/modules/identity#identity_create'},
    {id: 'https://payswarm.com/modules/identity#identity_edit'},
    {id: 'https://payswarm.com/modules/identity#public_key_create'},
    {id: 'https://payswarm.com/modules/identity#public_key_remove'},
    {id: 'https://payswarm.com/modules/address-validator#address_validator_access'},
    // financial permissions
    {id: 'https://payswarm.com/modules/financial#account_access'},
    {id: 'https://payswarm.com/modules/financial#account_create'},
    {id: 'https://payswarm.com/modules/financial#account_edit'},
    {id: 'https://payswarm.com/modules/financial#budget_access'},
    {id: 'https://payswarm.com/modules/financial#budget_create'},
    {id: 'https://payswarm.com/modules/financial#budget_edit'},
    {id: 'https://payswarm.com/modules/financial#budget_remove'},
    {id: 'https://payswarm.com/modules/financial#payment_token_access'},
    {id: 'https://payswarm.com/modules/financial#payment_token_create'},
    {id: 'https://payswarm.com/modules/financial#payment_token_edit'},
    {id: 'https://payswarm.com/modules/financial#payment_token_remove'},
    {id: 'https://payswarm.com/modules/financial#transaction_access'},
    {id: 'https://payswarm.com/modules/financial#transaction_create'},
    // promo permissions
    {id: 'https://payswarm.com/modules/promo#promo_redeem_code'},
    // hosted permissions
    {id: 'https://payswarm.com/modules/hosted#asset_access'},
    {id: 'https://payswarm.com/modules/hosted#asset_create'},
    {id: 'https://payswarm.com/modules/hosted#asset_edit'},
    {id: 'https://payswarm.com/modules/hosted#asset_remove'},
    {id: 'https://payswarm.com/modules/hosted#listing_access'},
    {id: 'https://payswarm.com/modules/hosted#listing_create'},
    {id: 'https://payswarm.com/modules/hosted#listing_edit'},
    {id: 'https://payswarm.com/modules/hosted#listing_remove'}
  ]
});
