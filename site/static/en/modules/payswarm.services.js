/*!
 * PaySwarm Angular Services
 *
 * @requires jQuery v1.7+ (http://jquery.com/)
 *
 * @author Dave Longley
 */
(function($) {

angular.module('payswarm.services')
.factory('svcTemplateCache', function($http, $templateCache) {
  var service = {};
  service.get = function(url, callback) {
    $http.get(url, {cache: $templateCache})
      .success(function(data) {
        callback(null, data);
      })
      .error(function(data, status, headers) {
        callback('Failed to load template: ' + url);
      });
  };
  return service;
})
.factory('svcConstant', function() {
  var service = {};

  // months for date handling
  service.monthNames = [
    'January','February','March','April',
    'May','June','July','August',
    'September','October','November','December'];
  service.monthNumbers = [
    '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

  // create {index: #, label: "01 - January"} labels
  service.monthLabels = [];
  for(var i = 0; i < 12; ++i) {
    service.monthLabels[i] = {
      index: i + 1,
      label: service.monthNumbers[i] + ' - ' + service.monthNames[i]
    };
  }

  // next ten 10 years for expiration dates (quick hack)
  service.years = [];
  var year = new Date().getFullYear();
  for(var i = 0; i < 10; ++i) {
    service.years.push(year + i);
  }

  // country map sorted by display order
  service.countries = [
    {code:'AH', name:'Afghanistan'},
    {code:'AL', name:'Albania'},
    {code:'DZ', name:'Algeria'},
    {code:'AD', name:'Andorra'},
    {code:'AO', name:'Angola'},
    {code:'AI', name:'Anguilla'},
    {code:'AQ', name:'Antarctica'},
    {code:'AG', name:'Antigua'},
    {code:'AM', name:'Armenia'},
    {code:'AR', name:'Argentina'},
    {code:'AW', name:'Aruba'},
    {code:'AU', name:'Australia'},
    {code:'AT', name:'Austria'},
    {code:'AZ', name:'Azerbaidjan'},
    {code:'BS', name:'Bahamas'},
    {code:'BH', name:'Bahrain'},
    {code:'BD', name:'Bangladesh'},
    {code:'BB', name:'Barbados'},
    {code:'BY', name:'Belarus'},
    {code:'BE', name:'Belgium'},
    {code:'BZ', name:'Belize'},
    {code:'BJ', name:'Benin'},
    {code:'BM', name:'Bermuda'},
    {code:'BT', name:'Bhutan'},
    {code:'BA', name:'Bosnia-Herzegovina'},
    {code:'BO', name:'Bolivia'},
    {code:'BW', name:'Botswana'},
    {code:'BV', name:'Bouvet Island'},
    {code:'BR', name:'Brazil'},
    {code:'BN', name:'Brunei Darussalam'},
    {code:'BG', name:'Bulgaria'},
    {code:'BF', name:'Burkina Faso'},
    {code:'BI', name:'Burundi'},
    {code:'KH', name:'Cambodia'},
    {code:'CM', name:'Cameroon'},
    {code:'CA', name:'Canada'},
    {code:'CV', name:'Cape Verde'},
    {code:'KY', name:'Cayman Islands'},
    {code:'CF', name:'Central African Republic'},
    {code:'TD', name:'Chad'},
    {code:'CL', name:'Chile'},
    {code:'CN', name:'China'},
    {code:'CX', name:'Christmas Island'},
    {code:'HR', name:'Croatia'},
    {code:'CC', name:'Cocos Islands'},
    {code:'CO', name:'Colombia'},
    {code:'KM', name:'Comoros'},
    {code:'CG', name:'Congo'},
    {code:'CD', name:'Congo, Democratic Republic'},
    {code:'CK', name:'Cook Islands'},
    {code:'CR', name:'Costa Rica'},
    {code:'CU', name:'Cuba'},
    {code:'CY', name:'Cyprus'},
    {code:'CZ', name:'Czech Republic'},
    {code:'DJ', name:'Djibouti'},
    {code:'DK', name:'Denmark'},
    {code:'DM', name:'Dominica'},
    {code:'DO', name:'Dominican Republic'},
    {code:'TP', name:'East Timor'},
    {code:'EC', name:'Ecuador'},
    {code:'FG', name:'Egypt'},
    {code:'SV', name:'El Salvador'},
    {code:'ER', name:'Eritrea'},
    {code:'EE', name:'Estonia'},
    {code:'ET', name:'Ethiopia'},
    {code:'GQ', name:'Equatorial Guinea'},
    {code:'FK', name:'Falkland Islands'},
    {code:'FJ', name:'Fiji'},
    {code:'FI', name:'Finland'},
    {code:'GF', name:'French Guyana'},
    {code:'FO', name:'Faroe Islands'},
    {code:'FR', name:'France'},
    {code:'GA', name:'Gabon'},
    {code:'GM', name:'Gambia'},
    {code:'GE', name:'Georgia'},
    {code:'DE', name:'Germany'},
    {code:'GH', name:'Ghana'},
    {code:'GI', name:'Gibraltar'},
    {code:'GR', name:'Greece'},
    {code:'GL', name:'Greenland'},
    {code:'GD', name:'Grenada'},
    {code:'GP', name:'Guadeloupe'},
    {code:'GU', name:'Guam'},
    {code:'GT', name:'Guatemala'},
    {code:'GN', name:'Guinea'},
    {code:'GW', name:'Guinea Bissau'},
    {code:'GY', name:'Guyana'},
    {code:'HT', name:'Haiti'},
    {code:'HM', name:'Heard and McDonald Islands'},
    {code:'HN', name:'Honduras'},
    {code:'HK', name:'Hong Kong'},
    {code:'HU', name:'Hungary'},
    {code:'IS', name:'Iceland'},
    {code:'IN', name:'India'},
    {code:'ID', name:'Indonesia'},
    {code:'IQ', name:'Iraq'},
    {code:'IR', name:'Iran'},
    {code:'IE', name:'Ireland'},
    {code:'IL', name:'Israel'},
    {code:'IT', name:'Italy'},
    {code:'CI', name:'Ivory Coast'},
    {code:'JM', name:'Jamaica'},
    {code:'JP', name:'Japan'},
    {code:'JO', name:'Jordan'},
    {code:'KE', name:'Kenya'},
    {code:'KI', name:'Kiribati'},
    {code:'KG', name:'Kyrgyz Republic (Kyrgyzstan)'},
    {code:'KW', name:'Kuwait'},
    {code:'KZ', name:'Kazakhstan'},
    {code:'LA', name:'Laos'},
    {code:'LV', name:'Latvia'},
    {code:'LB', name:'Lebanon'},
    {code:'LS', name:'Lesotho'},
    {code:'LR', name:'Liberia'},
    {code:'LI', name:'Liechtenstein'},
    {code:'LT', name:'Lithuania'},
    {code:'LY', name:'Libya'},
    {code:'LU', name:'Luxembourg'},
    {code:'MO', name:'Macau'},
    {code:'MK', name:'Macedonia'},
    {code:'MG', name:'Madagascar'},
    {code:'ML', name:'Mali'},
    {code:'MT', name:'Malta'},
    {code:'MV', name:'Maldives'},
    {code:'MW', name:'Malawi'},
    {code:'MY', name:'Malaysia'},
    {code:'MH', name:'Marshall Islands'},
    {code:'MQ', name:'Martinique'},
    {code:'MR', name:'Mauritania'},
    {code:'MU', name:'Mauritius'},
    {code:'YT', name:'Mayotte'},
    {code:'MX', name:'Mexico'},
    {code:'FM', name:'Micronesia'},
    {code:'MD', name:'Moldavia'},
    {code:'MC', name:'Monaco'},
    {code:'MN', name:'Mongolia'},
    {code:'MS', name:'Montserrat'},
    {code:'MA', name:'Morocco'},
    {code:'MZ', name:'Mozambique'},
    {code:'MM', name:'Myanmar'},
    {code:'NA', name:'Namibia'},
    {code:'NR', name:'Nauru'},
    {code:'NP', name:'Nepal'},
    {code:'NL', name:'Netherlands'},
    {code:'NC', name:'New Caledonia'},
    {code:'NZ', name:'New Zealand'},
    {code:'NE', name:'Niger'},
    {code:'NG', name:'Nigeria'},
    {code:'NI', name:'Nicaragua'},
    {code:'NU', name:'Niue'},
    {code:'NF', name:'Norfolk Island'},
    {code:'KP', name:'North Korea'},
    {code:'MP', name:'Northern Mariana Islands'},
    {code:'NO', name:'Norway'},
    {code:'OM', name:'Oman'},
    {code:'PW', name:'Palau'},
    {code:'PK', name:'Pakistan'},
    {code:'PA', name:'Panama'},
    {code:'PG', name:'Papua New Guinea'},
    {code:'PY', name:'Paraguay'},
    {code:'PE', name:'Peru'},
    {code:'PH', name:'Philippines'},
    {code:'PN', name:'Pitcairn Island'},
    {code:'PR', name:'Puerto Rico'},
    {code:'PL', name:'Poland'},
    {code:'PF', name:'Polynesia'},
    {code:'PT', name:'Portugal'},
    {code:'QA', name:'Qatar'},
    {code:'RE', name:'Reunion'},
    {code:'RO', name:'Romania'},
    {code:'RU', name:'Russia'},
    {code:'RW', name:'Rwanda'},
    {code:'SH', name:'Saint Helena'},
    {code:'KN', name:'Saint Kitts and Nevis Anguilla'},
    {code:'LC', name:'Saint Lucia'},
    {code:'PM', name:'Saint Pierre and Miquelon'},
    {code:'ST', name:'Saint Tome and Principe'},
    {code:'WS', name:'Samoa'},
    {code:'SM', name:'San Marino'},
    {code:'SA', name:'Saudi Arabia'},
    {code:'SN', name:'Senegal'},
    {code:'SC', name:'Seychelles'},
    {code:'SL', name:'Sierra Leone'},
    {code:'SG', name:'Singapore'},
    {code:'SK', name:'Slovak Republic'},
    {code:'SI', name:'Slovenia'},
    {code:'SB', name:'Solomon Islands'},
    {code:'SO', name:'Somalia'},
    {code:'ZA', name:'South Africa'},
    {code:'GS', name:'S. Georgia and S. Sandwich Isls.'},
    {code:'KR', name:'South Korea'},
    {code:'ES', name:'Spain'},
    {code:'LK', name:'Sri Lanka'},
    {code:'SD', name:'Sudan'},
    {code:'SS', name:'South Sudan'},
    {code:'SR', name:'Suriname'},
    {code:'SJ', name:'Svalbard and Jan Mayen Islands'},
    {code:'SZ', name:'Swaziland'},
    {code:'SE', name:'Sweden'},
    {code:'CH', name:'Switzerland'},
    {code:'SY', name:'Syria'},
    {code:'TJ', name:'Tadjikistan'},
    {code:'TW', name:'Taiwan'},
    {code:'TZ', name:'Tanzania'},
    {code:'TG', name:'Togo'},
    {code:'TK', name:'Tokelau'},
    {code:'TO', name:'Tonga'},
    {code:'TH', name:'Thailand'},
    {code:'TN', name:'Tunisia'},
    {code:'TR', name:'Turkey'},
    {code:'TM', name:'Turkmenistan'},
    {code:'TC', name:'Turks and Caicos Islands'},
    {code:'TT', name:'Trinidad and Tobago'},
    {code:'TV', name:'Tuvalu'},
    {code:'UA', name:'Ukraine'},
    {code:'UG', name:'Uganda'},
    {code:'AE', name:'United Arab Emirates'},
    {code:'UK', name:'United Kingdom'},
    {code:'US', name:'United States'},
    {code:'UY', name:'Uruguay'},
    {code:'UZ', name:'Uzbekistan'},
    {code:'VA', name:'Vatican City'},
    {code:'VC', name:'Saint Vincent and Grenadines'},
    {code:'VU', name:'Vanuatu'},
    {code:'VE', name:'Venezuela'},
    {code:'VG', name:'Virgin Islands (British)'},
    {code:'VI', name:'Virgin Islands (USA)'},
    {code:'VN', name:'Vietnam'},
    {code:'WF', name:'Wallis and Futuna Islands'},
    {code:'EH', name:'Western Sahara'},
    {code:'YE', name:'Yemen'},
    {code:'YU', name:'Yugoslavia'},
    {code:'ZR', name:'Zaire'},
    {code:'ZM', name:'Zambia'},
    {code:'ZW', name:'Zimbabwe'}
  ];

  return service;
})
.factory('svcAddress', function($timeout, $rootScope, svcIdentity) {
  // address service
  var service = {};

  var identity = svcIdentity.identity;
  var expires = 0;
  var maxAge = 1000*60*2;
  service.addresses = [];
  service.state = {
    loading: false
  };

  // get all addresses for an identity
  service.get = function(options, callback) {
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || angular.noop;

    if(options.force || +new Date() >= expires) {
      service.state.loading = true;
      $timeout(function() {
        payswarm.addresses.get({
          identity: identity.id,
          success: function(addresses) {
            _replaceArray(service.addresses, addresses, 'label');
            expires = +new Date() + maxAge;
            service.state.loading = false;
            callback(null, service.addresses);
            $rootScope.$apply();
          },
          error: function(err) {
            service.state.loading = false;
            callback(err);
            $rootScope.$apply();
          }
        });
      }, options.delay || 0);
    }
    else {
      $timeout(function() {
        callback(null, service.addresses);
      });
    }
  };

  // validate an address
  service.validate = function(address, callback) {
    callback = callback || angular.noop;
    payswarm.addresses.validate({
      identity: identity.id,
      address: address,
      success: function(validated) {
        callback(null, validated);
      },
      error: callback
    });
  };

  // add a new address
  service.add = function(address, callback) {
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.addresses.add({
      identity: identity.id,
      address: address,
      success: function(address) {
        service.addresses.push(address);
        service.state.loading = false;
        callback(null, address);
        $rootScope.$apply();
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
        $rootScope.$apply();
      }
    });
  };

  // delete an address by label
  service.del = function(address, callback) {
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.addresses.del({
      identity: identity.id,
      addressId: address.label,
      success: function() {
        _removeFromArray(address.label, service.addresses, 'label');
        service.state.loading = false;
        callback();
        $rootScope.$apply();
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
        $rootScope.$apply();
      }
    });
  };

  return service;
})
.factory('svcAccount', function($timeout, $rootScope, svcIdentity) {
  // accounts service
  var service = {};

  var identity = svcIdentity.identity;
  var maxAge = 1000*60*2;
  service.identities = {};
  angular.forEach(svcIdentity.identities, function(identity) {
    service.identities[identity.id] = {accounts: [], expires: 0};
  });
  service.accounts = service.identities[identity.id].accounts;
  service.state = {
    loading: false
  };

  // get all accounts for an identity
  service.get = function(options, callback) {
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || angular.noop;

    var entry = service.identities[options.identity || identity.id];
    if(options.force || +new Date() >= entry.expires) {
      service.state.loading = true;
      $timeout(function() {
        payswarm.accounts.get({
          identity: options.identity || identity.id,
          success: function(accounts) {
            _replaceArray(entry.accounts, accounts);
            entry.expires = +new Date() + maxAge;
            service.state.loading = false;
            callback(null, entry.accounts);
            $rootScope.$apply();
          },
          error: function(err) {
            service.state.loading = false;
            callback(err);
            $rootScope.$apply();
          }
        });
      }, options.delay || 0);
    }
    else {
      $timeout(function() {
        callback(null, entry.accounts);
      });
    }
  };

  // get a single account
  service.getOne = function(accountId, options, callback) {
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || angular.noop;

    service.state.loading = true;
    $timeout(function() {
      payswarm.accounts.getOne({
        account: accountId,
        success: function(account) {
          _replaceInArray(service.accounts, account);
          service.state.loading = false;
          callback(null, account);
          $rootScope.$apply();
        },
        error: function(err) {
          service.state.loading = false;
          callback(err);
          $rootScope.$apply();
        }
      });
    }, options.delay || 0);
  };

  // add a new account
  service.add = function(account, identityId, callback) {
    if(typeof identityId === 'function') {
      identityId = identity.id;
    }
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.accounts.add({
      identity: identityId,
      account: account,
      success: function(account) {
        service.identities[identityId].accounts.push(account);
        service.state.loading = false;
        callback(null, account);
        $rootScope.$apply();
        // update account to get latest balance
        // FIXME: in future, use real time events
        service.getOne(account.id, {delay: 500});
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
        $rootScope.$apply();
      }
    });
  };

  // update an account
  service.update = function(account, callback) {
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.accounts.update({
      identity: identity.id,
      account: account,
      success: function() {
        // get account
        service.getOne(account.id, callback);
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
        $rootScope.$apply();
      }
    });
  };

  return service;
})
.factory('svcBudget', function($timeout, $filter, $rootScope, svcIdentity) {
  // budgets service
  var service = {};

  var identity = svcIdentity.identity;
  var expires = 0;
  var maxAge = 1000*60*2;
  service.budgets = [];
  service.vendors = {};
  service.state = {
    loading: false
  };

  // get all budgets for an identity
  service.get = function(options, callback) {
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || angular.noop;

    if(options.force || +new Date() >= expires) {
      service.state.loading = true;
      $timeout(function() {
        payswarm.budgets.get({
          identity: identity.id,
          success: function(budgets) {
            _replaceArray(service.budgets, budgets);
            expires = +new Date() + maxAge;
            service.state.loading = false;
            callback(null, service.budgets);
            $rootScope.$apply();
          },
          error: function(err) {
            service.state.loading = false;
            callback(err);
            $rootScope.$apply();
          }
        });
      }, options.delay || 0);
    }
    else {
      $timeout(function() {
        callback(null, service.budgets);
      });
    }
  };

  // get a single budget
  service.getOne = function(budgetId, options, callback) {
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || angular.noop;

    service.state.loading = true;
    $timeout(function() {
      payswarm.budgets.getOne({
        budget: budgetId,
        success: function(budget) {
          _replaceInArray(service.budgets, budget);
          service.state.loading = false;
          callback(null, budget);
          $rootScope.$apply();
        },
        error: function(err) {
          service.state.loading = false;
          callback(err);
          $rootScope.$apply();
        }
      });
    }, options.delay || 0);
  };

  // add a new budget
  service.add = function(budget, callback) {
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.budgets.add({
      identity: identity.id,
      budget: budget,
      success: function(budget) {
        service.budgets.push(budget);
        service.state.loading = false;
        callback(null, budget);
        $rootScope.$apply();
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
        $rootScope.$apply();
      }
    });
  };

  // update a budget
  service.update = function(budget, callback) {
    service.state.loading = true;
    payswarm.budgets.update({
      identity: identity.id,
      budget: budget,
      success: function() {
        // get budget
        service.getOne(budget.id, callback);
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
        $rootScope.$apply();
      }
    });
  };

  // add a vendor to a budget
  service.addVendor = function(budgetId, vendorId, callback) {
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.budgets.addVendor({
      budget: budgetId,
      vendor: vendorId,
      success: function() {
        service.state.loading = false;
        callback();
        $rootScope.$apply();
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
        $rootScope.$apply();
      }
    });
  };

  // delete a vendor from a budget
  service.delVendor = function(budgetId, vendorId, callback) {
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.budgets.delVendor({
      budget: budgetId,
      vendor: vendorId,
      success: function() {
        // get budget and strip out vendorId
        var budget = $filter('filter')(service.budgets, {id:budgetId})[0];
        budget.vendor = $filter('filter')(budget.vendor, "!" + vendorId);
        service.state.loading = false;
        callback();
        $rootScope.$apply();
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
        $rootScope.$apply();
      }
    });
  };

  // gets the public vendor information for a budget
  service.getVendors = function(budgetId, options, callback) {
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || angular.noop;

    var expires = 0;
    if(budgetId in service.vendors) {
      expires = service.vendors[budgetId].expires;
    }
    if(options.force || +new Date() >= expires) {
      service.state.loading = true;
      if(!(budgetId in service.vendors)) {
        service.vendors[budgetId] = {vendors: [], expires: 0};
      }
      $timeout(function() {
        payswarm.budgets.getVendors({
          budget: budgetId,
          success: function(vendors) {
            var entry = service.vendors[budgetId];
            _replaceArray(entry.vendors, vendors);
            entry.expires = +new Date() + maxAge;
            service.state.loading = false;
            callback(null, entry.vendors);
            $rootScope.$apply();
          },
          error: function(err) {
            service.state.loading = false;
            callback(err);
            $rootScope.$apply();
          }
        });
      }, options.delay || 0);
    }
    else {
      $timeout(function() {
        callback(null, service.vendors[budgetId].vendors);
      });
    }
  };

  // deletes a budget
  service.del = function(budgetId, callback) {
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.budgets.del({
      budget: budgetId,
      success: function() {
        _removeFromArray(budgetId, service.budgets);
        service.state.loading = false;
        callback();
        $rootScope.$apply();
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
        $rootScope.$apply();
      }
    });
  };

  return service;
})
.factory('svcIdentity', function($rootScope) {
  // identity service
  var service = {};

  service.identity = window.data.session.identity;
  service.identityMap = window.data.session.identities;
  service.identities = [];
  angular.forEach(service.identityMap, function(identity) {
    service.identities.push(identity);
  });
  service.state = {
    loading: false
  };

  // add a new identity
  service.add = function(identity, callback) {
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.identities.add({
      identity: identity,
      success: function(identity) {
        service.identityMap[identity.id] = identity;
        service.identities.push(identity);
        service.state.loading = false;
        callback(null, identity);
        $rootScope.$apply();
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
        $rootScope.$apply();
      }
    });
  };

  // update identity preferences
  service.updatePreferences = function(
    identityId, preferences, nonce, callback) {
    if(typeof nonce === 'function') {
      callback = nonce;
      nonce = undefined;
    }
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.identities.preferences.update({
      identity: identityId,
      preferences: preferences,
      success: function() {
        // get identity preferences and post to callback
        payswarm.identities.preferences.get({
          identity: identity,
          responseNonce: nonce,
          success: function(prefs) {
            service.state.loading = false;
            callback(null, prefs);
            $rootScope.$apply();
          },
          error: function(err) {
            service.state.loading = false;
            callback(err);
            $rootScope.$apply();
          }
        });
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
        $rootScope.$apply();
      }
    });
  };

  return service;
})
.factory('svcPaymentToken', function($timeout, $rootScope, svcIdentity) {
  // paymentTokens service
  var service = {};

  var identity = svcIdentity.identity;
  var expires = 0;
  var maxAge = 1000*60*2;
  service.state = {
    loading: false
  };
  // all tokens
  service.paymentTokens = [];
  // active tokens
  service.active = [];
  // deleted tokens
  service.deleted = [];
  // type specific tokens
  service.creditCards = [];
  service.bankAccounts = [];
  // verified tokens
  service.verified = [];
  // class specific tokens
  // 'instant' tokens can be used in cases where a transfer of funds must take
  // place immediately.
  service.instant = [];

  service.paymentMethods = ['ccard:CreditCard', 'bank:BankAccount'];
  service.instantPaymentMethods = ['ccard:CreditCard'];

  function _updateTokens(paymentTokens) {
    if(paymentTokens) {
      // update tokens
      _replaceArray(service.paymentTokens, paymentTokens);
    }

    // filter types of tokens
    var active = [];
    var deleted = [];
    var creditCards = [];
    var bankAccounts = [];
    var instant = [];
    var verified = [];
    angular.forEach(service.paymentTokens, function(token) {
      if(token.psaStatus === 'active') {
        active.push(token);
      }
      else if(!token.psaStatus || token.psaStatus === 'deleted') {
        deleted.push(token);
      }
      if(token.paymentMethod === 'ccard:CreditCard') {
        creditCards.push(token);
      }
      else if(token.paymentMethod === 'bank:BankAccount') {
        bankAccounts.push(token);
      }
      if(service.instantPaymentMethods.indexOf(token.paymentMethod) !== -1 &&
        token.psaStatus === 'active' && token.psaVerified) {
        instant.push(token);
      }
      if(token.psaStatus === 'active' && token.psaVerified) {
        verified.push(token);
      }
    });
    _replaceArray(service.active, active);
    _replaceArray(service.deleted, deleted);
    _replaceArray(service.creditCards, creditCards);
    _replaceArray(service.bankAccounts, bankAccounts);
    _replaceArray(service.instant, instant);
    _replaceArray(service.verified, verified);
  }

  // get all paymentTokens for an identity
  service.get = function(options, callback) {
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || angular.noop;

    if(options.force || +new Date() >= expires) {
      service.state.loading = true;
      $timeout(function() {
        payswarm.paymentTokens.get({
          identity: identity.id,
          success: function(paymentTokens) {
            _updateTokens(paymentTokens);
            expires = +new Date() + maxAge;
            service.state.loading = false;
            callback(null, service.paymentTokens);
            $rootScope.$apply();
          },
          error: function(err) {
            service.state.loading = false;
            callback(err);
            $rootScope.$apply();
          }
        });
      }, options.delay || 0);
    }
    else {
      $timeout(function() {
        callback(null, service.paymentTokens);
      });
    }
  };

  // add a new paymentToken
  service.add = function(paymentToken, callback) {
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.paymentTokens.add({
      identity: identity.id,
      data: paymentToken,
      success: function(paymentToken) {
        _replaceInArray(service.paymentTokens, paymentToken);
        _updateTokens();
        service.state.loading = false;
        callback(null, paymentToken);
        $rootScope.$apply();
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
        $rootScope.$apply();
      }
    });
  };

  // update a paymentToken
  /*
  service.update = function(paymentToken, callback) {
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.paymentTokens.update({
      identity: identity.id,
      data: paymentToken,
      success: function(paymentToken) {
        _replaceInArray(service.paymentTokens, paymentToken);
        _updateTokens();
        service.state.loading = false;
        callback(null, paymentToken);
        $rootScope.$apply();
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
        $rootScope.$apply();
      }
    });
  };
  */

  // deletes a paymentToken
  service.del = function(paymentTokenId, callback) {
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.paymentTokens.del({
      paymentToken: paymentTokenId,
      success: function(data) {
        if(!data) {
          _removeFromArray(paymentTokenId, service.paymentTokens);
        }
        else {
          _replaceInArray(service.paymentTokens, data);
        }
        _updateTokens();
        service.state.loading = false;
        callback();
        $rootScope.$apply();
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
        $rootScope.$apply();
      }
    });
  };

  // restores a deleted but unexpired paymentToken
  service.restore = function(paymentTokenId, callback) {
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.paymentTokens.restore({
      paymentToken: paymentTokenId,
      success: function(token) {
        _replaceInArray(service.paymentTokens, token);
        _updateTokens();
        service.state.loading = false;
        callback();
        $rootScope.$apply();
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
        $rootScope.$apply();
      }
    });
  };

  return service;
})
.factory('svcModal', function($timeout) {
  // modals service
  var service = {};

  // the stack of currently open modals
  var modals = [];

  // shared modal options
  var modalOptions = {
    backdrop: 'static',
    keyboard: false,
    show: false
  };

  /**
   * Creates a customized modal directive. The return value of this
   * method should be passed to a module's directive method.
   *
   * @param options the directive options.
   *          templateUrl the URL to the template for the modal.
   *          [name] the name of the modal to use, set to the 'visible' var.
   *          [transclude] optional transclusion setting.
   *          [scope] optional isolate scope for the modal.
   *          [controller] optional controller for the modal.
   *          [link] optional link function for the modal.
   *
   * @return the directive configuration.
   */
  service.directive = function(options) {
    var scope = {
      visible: '=modalVisible',
      _callback: '&modalOnClose'
    };
    if(options.name) {
      scope.visible = '=modal' + options.name;
    }
    angular.extend(scope, options.scope || {});
    options.controller = options.controller || angular.noop;
    options.link = options.link || angular.noop;
    return {
      scope: scope,
      transclude: options.transclude || false,
      controller: options.controller,
      templateUrl: options.templateUrl,
      replace: true,
      link: function(scope, element, attrs, controller) {
        // lazily create modals div
        var modals = $('#modals');
        if(modals.length === 0) {
          modals = $('<div id="modals"></div>');
          $(document.body).append(modals);
        }

        // move element to modals div
        modals.append(element);

        // watch visible property, etc.
        link(scope, element, attrs);
        options.link(scope, element, attrs, controller);
      }
    };
  };

  /**
   * Links the modal's element.
   *
   * Watch the given element's modal attributes for changes; open or close
   * the modal associated with the element as appropriate, etc.
   *
   * @param scope the scope for the modal.
   * @param element the element for the modal.
   * @param attrs the attributes of the element.
   */
  function link(scope, element, attrs) {
    // initialize modal
    element.addClass('hide');
    element.modal(modalOptions);

    // make modal full-screen scrollable
    var modal = element.data('modal');
    var _backdrop = modal.backdrop;
    modal.backdrop = function(callback) {
      _backdrop.call(this, callback);
      if(this.isShown && this.options.backdrop) {
        var $elementWrapper = $('<div class="modal-wrapper" />');
        $elementWrapper.prependTo(this.$backdrop);
        this.$element.prependTo($elementWrapper);
        $('body').css({overflow: 'hidden'});

        // scroll any shown tooltips
        this.$backdrop.scroll(function(e) {
          var tooltips = $('[data-tooltip-title]', e.target);
          angular.forEach(tooltips, function(tooltip) {
            var tip = $(tooltip).data('tooltip');
            if(tip.shown) {
              var top = tip.top + tip.scrollTop - e.target.scrollTop;
              tip.tip().css({top: top});
            }
          });
        });
      }
    };
    var _removeBackdrop = modal.removeBackdrop;
    modal.removeBackdrop = function() {
      this.$element.insertAfter(this.$backdrop);
      _removeBackdrop.call(this);
      $('body').css({overflow: 'auto'});
    };

    // close modal when escape is pressed
    $(document).keyup(function(e) {
      if(e.keyCode === 27 && scope._open) {
        e.stopPropagation();
        close(scope, true);
      }
    });

    // ignore enter presses in the modal by default
    var modalEnter = attrs.modalEnter || 'false';
    if(!scope.$eval(modalEnter)) {
      element.keypress(function(e) {
        if(e.keyCode === 13 && scope._open) {
          e.preventDefault();
        }
      });
    }

    // open modal when visible is true, close when false
    scope._open = false;
    scope.$watch('visible', function(value) {
      if(value) {
        open(scope, element);
      }
      else {
        close(scope);
      }
    });

    // does any init work when modal opens
    scope.open = scope.open || angular.noop;

    // closes modal on success
    scope.close = function(err, result) {
      scope.error = err;
      scope.result = result;
      scope._success = true;
      close(scope);
    };
  };

  /**
   * Opens a modal.
   *
   * @param scope the modal's scope.
   * @param element the modal element.
   */
  function open(scope, element) {
    // already open
    if(scope._open) {
      return;
    }

    // init scope
    scope._open = true;
    scope._success = false;
    scope.error = null;
    scope.result = null;

    // get the parent modal, if any
    var parent = (modals.length > 0) ? modals[modals.length - 1] : null;

    // push the modal
    var modal = {
      element: element,
      parent: parent,
      hasChild: false
    };
    modals.push(modal);

    // close modal when it is hidden, open, and has no child
    element.one('hide', function() {
      if(scope._open && !modal.hasChild) {
        close(scope, true);
      }
    });

    // auto-bind any .btn-close classes here
    $('.btn-close', element).one('click', function(e) {
      e.preventDefault();
      close(scope, true);
    });

    // do custom open() and then show modal
    function show() {
      scope.open();
      element.one('shown', function() {
        element.removeClass('fade');
      });
      if(!parent) {
        element.addClass('fade');
      }
      element.modal('show');
    };

    if(parent) {
      // hide parent first, then show child
      parent.hasChild = true;
      parent.element.one('hidden', function() {
        show();
      });
      parent.element.modal('hide');
    }
    else {
      show();
    }
  }

  /**
   * Closes a modal.
   *
   * @param scope the modal's scope.
   * @param apply true if scope.$apply must be called.
   */
  function close(scope, apply) {
    // already closed
    if(!scope._open) {
      return;
    }

    // close the current modal
    var modal = modals.pop();
    scope._open = false;
    scope.visible = false;

    // set error to canceled if success is not set
    if(!scope.error && !scope._success) {
      scope.error = 'canceled';
    }

    if(apply) {
      scope.$apply();
    }

    if(modal.parent) {
      // once child is hidden, show parent
      modal.element.one('hidden', function() {
        modal.element.removeClass('fade');
        modal.parent.hasChild = false;
        modal.parent.element.modal('show');
      });
    }
    else {
      modal.element.addClass('fade');
    }
    // hide modal
    modal.element.modal('hide');

    // call callback
    if(scope._callback) {
      scope._callback.call(scope, {err: scope.error, result: scope.result});
    }
  };

  return service;
});

function _replace(dst, src) {
  if(dst !== src) {
    angular.forEach(dst, function(value, key) {
      delete dst[key];
    });
    angular.extend(dst, src);
  }
  return dst;
}

function _replaceInArray(array, src, id) {
  id = id || 'id';
  var found = false;
  for(var i = 0; !found && i < array.length; ++i) {
    if(array[i][id] === src[id]) {
      _replace(array[i], src);
      found = true;
    }
  }
  if(!found) {
    array.push(src);
  }
}

function _replaceArray(dst, src, id) {
  id = id || 'id';
  var dst_ = dst.slice();
  dst.splice(0, dst.length);
  angular.forEach(src, function(value) {
    // overwrite existing value in dst_ if exists
    for(var i = 0; i < dst_.length; ++i) {
      if(dst_[i][id] === value[id]) {
        value = _replace(dst_[i], value);
        dst_.splice(i, 1);
        break;
      }
    }
    dst.push(value);
  });
  return dst;
}

function _removeFromArray(target, array, id) {
  id = id || 'id';
  for(var i = 0; i < array.length; ++i) {
    if(typeof target === 'object') {
      if(array[i][id] === target[id]) {
        array.splice(i, 1);
        break;
      }
    }
    else if(array[i][id] === target) {
      array.splice(i, 1);
      break;
    }
  }
}

})(jQuery);
