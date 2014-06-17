/*
 * PaySwarm role configuration.
 *
 * Copyright (c) 2014 Digital Bazaar, Inc. All rights reserved.
 */
var config = require('bedrock').config;

require('./permissions');

var permissions = config.permission.permissions;
var roles = config.permission.roles;

roles['payswarm.budget.admin'] = {
  id: 'payswarm.budget.admin',
  label: 'Budget Administrator',
  comment: 'Role for budget administrators.',
  sysPermission: [
    permissions.BUDGET_ADMIN.id,
    permissions.BUDGET_ACCESS.id,
    permissions.BUDGET_CREATE.id,
    permissions.BUDGET_EDIT.id,
    permissions.BUDGET_REMOVE.id
  ]
};
roles['payswarm.financialAccount.admin'] = {
  id: 'payswarm.financialAccount.admin',
  label: 'Financial Account Administrator',
  comment: 'Role for financial account administrators.',
  sysPermission: [
    permissions.FINANCIAL_ACCOUNT_ADMIN.id,
    permissions.FINANCIAL_ACCOUNT_ACCESS.id,
    permissions.FINANCIAL_ACCOUNT_CREATE.id,
    permissions.FINANCIAL_ACCOUNT_EDIT.id,
    permissions.FINANCIAL_ACCOUNT_REMOVE.id
  ]
};
roles['payswarm.hostedAsset.admin'] = {
  id: 'payswarm.hostedAsset.admin',
  label: 'Hosted Asset Administrator',
  comment: 'Role for hosted asset administrators.',
  sysPermission: [
    permissions.HOSTED_ASSET_ADMIN.id,
    permissions.HOSTED_ASSET_ACCESS.id,
    permissions.HOSTED_ASSET_CREATE.id,
    permissions.HOSTED_ASSET_EDIT.id,
    permissions.HOSTED_ASSET_REMOVE.id,
  ]
};
roles['payswarm.hostedListing.admin'] = {
  id: 'payswarm.hostedListing.admin',
  label: 'Hosted Listing Administrator',
  comment: 'Role for hosted listing administrators.',
  sysPermission: [
    permissions.HOSTED_LISTING_ADMIN.id,
    permissions.HOSTED_LISTING_ACCESS.id,
    permissions.HOSTED_LISTING_CREATE.id,
    permissions.HOSTED_LISTING_EDIT.id,
    permissions.HOSTED_LISTING_REMOVE.id,
  ]
};
roles['payswarm.paymentToken.admin'] = {
  id: 'payswarm.paymentToken.admin',
  label: 'Payment Token Administrator',
  comment: 'Role for payment token administrators.',
  sysPermission: [
    permissions.PAYMENT_TOKEN_ADMIN.id,
    permissions.PAYMENT_TOKEN_ACCESS.id,
    permissions.PAYMENT_TOKEN_CREATE.id,
    permissions.PAYMENT_TOKEN_EDIT.id,
    permissions.PAYMENT_TOKEN_REMOVE.id
  ]
};
roles['payswarm.promo.admin'] = {
  id: 'payswarm.promo.admin',
  label: 'Promotion Administrator',
  comment: 'Role for promo administrators.',
  sysPermission: [
    permissions.PROMO_ADMIN.id,
    permissions.PROMO_ACCESS.id,
    permissions.PROMO_CREATE.id,
    permissions.PROMO_EDIT.id,
    permissions.PROMO_REDEEM_CODE.id,
    permissions.PROMO_REMOVE.id
  ]
};
roles['payswarm.transaction.admin'] = {
  id: 'payswarm.transaction.admin',
  label: 'Transaction Administrator',
  comment: 'Role for transaction administrators.',
  sysPermission: [
    permissions.TRANSACTION_ADMIN.id,
    permissions.TRANSACTION_ACCESS.id,
    permissions.TRANSACTION_CREATE.id
  ]
};

// payswarm admin role
roles['payswarm.admin'] = {
  id: 'payswarm.admin',
  label: 'PaySwarm Administrator',
  comment: 'Role for PaySwarm administrators.',
  sysPermission: [].concat(
    roles['identity.admin'].sysPermission,
    roles['payswarm.budget.admin'].sysPermission,
    roles['payswarm.financialAccount.admin'].sysPermission,
    roles['payswarm.paymentToken.admin'].sysPermission,
    roles['payswarm.promo.admin'].sysPermission,
    roles['payswarm.transaction.admin'].sysPermission
  )
};

// add address validation permissions to identity admin
roles['identity.admin'].sysPermission.push(
  permissions.ADDRESS_VALIDATOR_ADMIN.id);
roles['identity.admin'].sysPermission.push(
  permissions.ADDRESS_VALIDATOR_ACCESS.id);

// default registered identity role (contains all permissions for a regular
// identity)
roles['identity.registered'] = {
  id: 'identity.registered',
  label: 'Registered Identity',
  comment: 'Role for registered identities.',
  sysPermission: [].concat(
    roles['identity.manager'].sysPermission,
    [
      // address validation access
      permissions.ADDRESS_VALIDATOR_ACCESS.id,
      // budget permissions
      permissions.BUDGET_ACCESS.id,
      permissions.BUDGET_CREATE.id,
      permissions.BUDGET_EDIT.id,
      permissions.BUDGET_REMOVE.id,
      // financial account permissions
      permissions.FINANCIAL_ACCOUNT_ACCESS.id,
      permissions.FINANCIAL_ACCOUNT_CREATE.id,
      permissions.FINANCIAL_ACCOUNT_EDIT.id,
      permissions.FINANCIAL_ACCOUNT_REMOVE.id,
      // hosted asset permissions
      permissions.HOSTED_ASSET_ACCESS.id,
      permissions.HOSTED_ASSET_CREATE.id,
      permissions.HOSTED_ASSET_EDIT.id,
      permissions.HOSTED_ASSET_REMOVE.id,
      // hosted listing permissions
      permissions.HOSTED_LISTING_ACCESS.id,
      permissions.HOSTED_LISTING_CREATE.id,
      permissions.HOSTED_LISTING_EDIT.id,
      permissions.HOSTED_LISTING_REMOVE.id,
      // payment token permissions
      permissions.PAYMENT_TOKEN_ACCESS.id,
      permissions.PAYMENT_TOKEN_CREATE.id,
      permissions.PAYMENT_TOKEN_EDIT.id,
      permissions.PAYMENT_TOKEN_REMOVE.id,
      // promo permissions
      permissions.PROMO_ACCESS.id,
      permissions.PROMO_REDEEM_CODE.id,
      // transaction permissions
      permissions.TRANSACTION_ACCESS.id,
      permissions.TRANSACTION_CREATE.id
    ]
  )
};
