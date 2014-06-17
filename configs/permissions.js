/*
 * PaySwarm permission configuration.
 *
 * Copyright (c) 2014 Digital Bazaar, Inc. All rights reserved.
 */
var config = require('bedrock').config;

var permissions = config.permission.permissions;

// budget
permissions.BUDGET_ADMIN = {
  id: 'BUDGET_ADMIN',
  label: 'Budget Administration',
  comment: 'Required to administer Budgets.'
};
permissions.BUDGET_ACCESS = {
  id: 'BUDGET_ACCESS',
  label: 'Access Budget',
  comment: 'Required to access a Budget.'
};
permissions.BUDGET_CREATE = {
  id: 'BUDGET_CREATE',
  label: 'Create Budget',
  comment: 'Required to create a Budget.'
};
permissions.BUDGET_EDIT = {
  id: 'BUDGET_EDIT',
  label: 'Edit Budget',
  comment: 'Required to edit a Budget.'
};
permissions.BUDGET_REMOVE = {
  id: 'BUDGET_REMOVE',
  label: 'Remove Budget',
  comment: 'Required to remove a Budget.'
};

// hosted asset
permissions.HOSTED_ASSET_ADMIN = {
  id: 'HOSTED_ASSET_ADMIN',
  label: 'Hosted Asset Administration',
  comment: 'Required to administer hosted Assets.'
};
permissions.HOSTED_ASSET_ACCESS = {
  id: 'HOSTED_ASSET_ACCESS',
  label: 'Access Hosted Asset',
  comment: 'Required to access a hosted Asset.'
};
permissions.HOSTED_ASSET_CREATE = {
  id: 'HOSTED_ASSET_CREATE',
  label: 'Create Hosted Asset',
  comment: 'Required to create a hosted Asset.'
};
permissions.HOSTED_ASSET_EDIT = {
  id: 'HOSTED_ASSET_EDIT',
  label: 'Edit Hosted Asset',
  comment: 'Required to edit a hosted Asset.'
};
permissions.HOSTED_ASSET_REMOVE = {
  id: 'HOSTED_ASSET_REMOVE',
  label: 'Remove Hosted Asset',
  comment: 'Required to remove a hosted Asset.'
};

// hosted listing
permissions.HOSTED_LISTING_ADMIN = {
  id: 'HOSTED_LISTING_ADMIN',
  label: 'Hosted Listing Administration',
  comment: 'Required to administer hosted Listings.'
};
permissions.HOSTED_LISTING_ACCESS = {
  id: 'HOSTED_LISTING_ACCESS',
  label: 'Access Hosted Listing',
  comment: 'Required to access a hosted Listing.'
};
permissions.HOSTED_LISTING_CREATE = {
  id: 'HOSTED_LISTING_CREATE',
  label: 'Create Hosted Listing',
  comment: 'Required to create a hosted Listing.'
};
permissions.HOSTED_LISTING_EDIT = {
  id: 'HOSTED_LISTING_EDIT',
  label: 'Edit Hosted Listing',
  comment: 'Required to edit a hosted Listing.'
};
permissions.HOSTED_LISTING_REMOVE = {
  id: 'HOSTED_LISTING_REMOVE',
  label: 'Remove Hosted Listing',
  comment: 'Required to remove a hosted Listing.'
};

// financial account
permissions.FINANCIAL_ACCOUNT_ADMIN = {
  id: 'FINANCIAL_ACCOUNT_ADMIN',
  label: 'Account Administration',
  comment: 'Required to administer Accounts.'
};
permissions.FINANCIAL_ACCOUNT_ACCESS = {
  id: 'FINANCIAL_ACCOUNT_ACCESS',
  label: 'Access Account',
  comment: 'Required to access an Account.'
};
permissions.FINANCIAL_ACCOUNT_CREATE = {
  id: 'FINANCIAL_ACCOUNT_CREATE',
  label: 'Create Account',
  comment: 'Required to create an Account.'
};
permissions.FINANCIAL_ACCOUNT_EDIT = {
  id: 'FINANCIAL_ACCOUNT_EDIT',
  label: 'Edit Account',
  comment: 'Required to edit an Account.'
};
permissions.FINANCIAL_ACCOUNT_REMOVE = {
  id: 'FINANCIAL_ACCOUNT_REMOVE',
  label: 'Remove Account',
  comment: 'Required to remove an Account.'
};

// payment token
permissions.PAYMENT_TOKEN_ADMIN = {
  id: 'PAYMENT_TOKEN_ADMIN',
  label: 'Payment Token Administration',
  comment: 'Required to administer Payment Tokens.'
};
permissions.PAYMENT_TOKEN_ACCESS = {
  id: 'PAYMENT_TOKEN_ACCESS',
  label: 'Access Payment Token',
  comment: 'Required to access a Payment Token.'
};
permissions.PAYMENT_TOKEN_CREATE = {
  id: 'PAYMENT_TOKEN_CREATE',
  label: 'Create Payment Token',
  comment: 'Required to create a Payment Token.'
};
permissions.PAYMENT_TOKEN_EDIT = {
  id: 'PAYMENT_TOKEN_EDIT',
  label: 'Edit Payment Token',
  comment: 'Required to edit a Payment Token.'
};
permissions.PAYMENT_TOKEN_REMOVE = {
  id: 'PAYMENT_TOKEN_REMOVE',
  label: 'Remove Payment Token',
  comment: 'Required to remove a Payment Token.'
};

// promo
permissions.PROMO_ADMIN = {
  id: 'PROMO_ADMIN',
  label: 'Promotion Administration',
  comment: 'Required to administer Promotions.'
};
permissions.PROMO_ACCESS = {
  id: 'PROMO_ACCESS',
  label: 'Access Promotion',
  comment: 'Required to access a Promotion.'
};
permissions.PROMO_CREATE = {
  id: 'PROMO_CREATE',
  label: 'Create Promotion',
  comment: 'Required to create a Promotion.'
};
permissions.PROMO_EDIT = {
  id: 'PROMO_EDIT',
  label: 'Edit Promotion',
  comment: 'Required to edit a Promotion.'
};
permissions.PROMO_REDEEM_CODE = {
  id: 'PROMO_REDEEM_CODE',
  label: 'Redeem a Promotional Code',
  comment: 'Required to redeem a Promotional Code.'
};
permissions.PROMO_REMOVE = {
  id: 'PROMO_REMOVE',
  label: 'Remove Promotion',
  comment: 'Required to remove a Promotion.'
};

// transaction
permissions.TRANSACTION_ADMIN = {
  id: 'TRANSACTION_ADMIN',
  label: 'Transaction Administration',
  comment: 'Required to administer Transactions.'
};
permissions.TRANSACTION_ACCESS = {
  id: 'TRANSACTION_ACCESS',
  label: 'Access Transaction',
  comment: 'Required to access a Transaction.'
};
permissions.TRANSACTION_CREATE = {
  id: 'TRANSACTION_CREATE',
  label: 'Create Transaction',
  comment: 'Required to create a Transaction.'
};
