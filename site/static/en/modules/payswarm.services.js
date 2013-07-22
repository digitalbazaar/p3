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

  function _entry(identityId) {
    if(!(identityId in service.identities)) {
      service.identities[identityId] = {
        addresses: [],
        expires: 0
      };
    }
    return service.identities[identityId];
  }

  var identity = svcIdentity.identity;
  var maxAge = 1000*60*2;
  service.identities = {};
  service.addresses = _entry(identity.id).addresses;
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
    var identityId = options.identity || identity.id;

    var entry = _entry(identityId);
    if(options.force || +new Date() >= entry.expires) {
      service.state.loading = true;
      $timeout(function() {
        payswarm.addresses.get({
          identity: identityId,
          success: function(addresses) {
            _replaceArray(entry.addresses, addresses, 'label');
            entry.expires = +new Date() + maxAge;
            service.state.loading = false;
            callback(null, entry.addresses);
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
        callback(null, entry.addresses);
      });
    }
  };

  // validate an address
  service.validate = function(address, callback) {
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.addresses.validate({
      identity: identity.id,
      address: address,
      success: function(validated) {
        service.state.loading = false;
        callback(null, validated);
        $rootScope.$apply();
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
        $rootScope.$apply();
      }
    });
  };

  // add a new address
  service.add = function(address, identityId, callback) {
    if(typeof identityId === 'function') {
      callback = identityId;
      identityId = identity.id;
    }
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.addresses.add({
      identity: identityId,
      address: address,
      success: function(address) {
        var entry = _entry(identityId);
        entry.addresses.push(address);
        if(identityId === identity.id) {
          identity.address.push(address);
        }
        // FIXME: create and/or push to
        //   svcIdentity.identityMap[identityId].address?
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
        _removeFromArray(address.label, identity.address, 'label');
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

  function _entry(identityId) {
    if(!(identityId in service.identities)) {
      service.identities[identityId] = {
        accounts: [],
        expires: 0
      };
    }
    return service.identities[identityId];
  }

  var identity = svcIdentity.identity;
  var maxAge = 1000*60*2;
  service.identities = {};
  service.accounts = _entry(identity.id).accounts;
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
    var identityId = options.identity || identity.id;

    var entry = _entry(identityId);
    if(options.force || +new Date() >= entry.expires) {
      service.state.loading = true;
      $timeout(function() {
        payswarm.accounts.get({
          identity: identityId,
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
          var entry = _entry(account.owner);
          _replaceInArray(entry.accounts, account);
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
      callback = identityId;
      identityId = identity.id;
    }
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.accounts.add({
      identity: identityId,
      account: account,
      success: function(account) {
        var entry = _entry(identityId);
        entry.accounts.push(account);
        service.state.loading = false;
        callback(null, account);
        $rootScope.$apply();
        // update account to get latest balance
        // FIXME: in future, use real-time events
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
.factory('svcBudget', function($timeout, $rootScope, svcIdentity) {
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
    callback = callback || angular.noop;
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
        var budget = service.budgets.filter(function(v) {
          return v.id === budgetId;
        })[0];
        budget.vendor = budget.vendor.filter(function(v) {
          return v !== vendorId;
        });
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

  // helper function to get the last refresh date for the given budget
  service.getLastRefresh = function(budget) {
    if(!budget) {
      return null;
    }
    var interval = budget.psaRefreshInterval.split('/');
    if(interval.length === 3) {
      return new Date(interval[1]);
    }
    return new Date(interval[0]);
  };

  // helper function to get the refresh duration for the given budget
  service.getRefreshDuration = function(budget) {
    if(!budget) {
      return null;
    }
    var interval = budget.psaRefreshInterval.split('/');
    if(interval.length === 3) {
      return interval[2];
    }
    return 'never';
  };

  // helper function to get the valid duration for the given budget
  service.getValidDuration = function(budget) {
    if(!budget) {
      return null;
    }
    var interval = budget.psaValidityInterval.split('/');
    if(interval.length === 1) {
      return 'never';
    }
    return interval[1];
  };

  // helper function to get expiration date for the given budget
  service.getExpiration = function(budget) {
    if(!budget) {
      return null;
    }
    var interval = budget.psaValidityInterval.split('/');
    if(interval.length === 1) {
      return 'never';
    }
    else if(iso8601.Period.isValid(interval[1])) {
      var start = +new Date(interval[0]);
      var end = start + iso8601.Period.parseToTotalSeconds(interval[1]) * 1000;
      return new Date(end);
    }
    return new Date(interval[1]);
  };

  return service;
})
.factory('svcIdentity', function($rootScope) {
  // identity service
  var service = {};

  var data = window.data || {};
  var session = data.session || {auth: false};
  service.identity = session.identity || null;
  service.identityMap = session.identities || {};
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
.factory('svcKey', function($timeout, $rootScope, svcIdentity) {
  // key service
  var service = {};

  var identity = svcIdentity.identity;
  var expires = 0;
  var maxAge = 1000*60*2;
  service.keys = [];
  service.state = {
    loading: false
  };

  // get all keys for an identity
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
        payswarm.keys.get({
          identity: identity.id,
          success: function(keys) {
            expires = +new Date() + maxAge;
            _replaceArray(service.keys, keys);
            service.state.loading = false;
            callback(null, service.keys);
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
        callback(null, service.keys);
      });
    }
  };

  // get a single key
  service.getOne = function(keyId, options, callback) {
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || angular.noop;

    service.state.loading = true;
    $timeout(function() {
      payswarm.keys.getOne({
        key: keyId,
        success: function(key) {
          _replaceInArray(service.keys, key);
          service.state.loading = false;
          callback(null, key);
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

  // update a key
  service.update = function(key, callback) {
    service.state.loading = true;
    payswarm.keys.update({
      key: key,
      success: function() {
        // get key
        service.getOne(key.id, callback);
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
        $rootScope.$apply();
      }
    });
  };

  // revoke a key
  service.revoke = function(key, callback) {
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.keys.revoke({
      key: key.id,
      success: function(key) {
        service.state.loading = false;
        _replaceInArray(service.keys, key);
        callback(null, key);
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
  // class specific tokens
  // 'instant' tokens can be used in cases where a transfer of funds must take
  // place immediately.
  service.instant = [];
  // non-instant
  service.nonInstant = [];

  service.paymentMethods = ['CreditCard', 'BankAccount'];
  service.nonInstantPaymentMethods = ['BankAccount'];
  service.instantPaymentMethods = ['CreditCard'];

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
    var nonInstant = [];
    angular.forEach(service.paymentTokens, function(token) {
      if(token.psaStatus === 'active') {
        active.push(token);
      }
      else if(!token.psaStatus || token.psaStatus === 'deleted') {
        deleted.push(token);
      }

      if(token.paymentMethod === 'CreditCard') {
        creditCards.push(token);
      }
      else if(token.paymentMethod === 'BankAccount') {
        bankAccounts.push(token);
      }

      if(token.psaStatus === 'active') {
        if(service.instantPaymentMethods.indexOf(token.paymentMethod) !== -1) {
          instant.push(token);
        }
        if(service.nonInstantPaymentMethods.indexOf(
          token.paymentMethod) !== -1) {
          nonInstant.push(token);
        }
      }
    });
    _replaceArray(service.active, active);
    _replaceArray(service.deleted, deleted);
    _replaceArray(service.creditCards, creditCards);
    _replaceArray(service.bankAccounts, bankAccounts);
    _replaceArray(service.instant, instant);
    _replaceArray(service.nonInstant, nonInstant);
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

  // get a single paymentToken
  service.getOne = function(paymentTokenId, options, callback) {
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || angular.noop;

    service.state.loading = true;
    $timeout(function() {
      payswarm.paymentTokens.getOne({
        paymentToken: paymentTokenId,
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
    }, options.delay || 0);
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

  // verify a token
  service.verify = function(paymentTokenId, verifyRequest, callback) {
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.paymentTokens.verify({
      paymentToken: paymentTokenId,
      data: verifyRequest,
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

  return service;
})
.factory('svcTransaction', function($timeout, $rootScope, svcIdentity) {
  // transaction service
  var service = {};

  var identity = svcIdentity.identity;
  var expires = 0;
  var maxAge = 1000*60*2;
  service.recentTxns = [];
  service.accounts = {};
  service.state = {
    loading: false
  };

  /**
   * Gets the transactions for an identity.
   *
   * @param options the options to use:
   *          [delay] a timeout to wait before fetching transactions.
   *          [createdStart] the creation start date.
   *          [account] the account.
   *          [previous] the previous transaction (for pagination).
   *          [limit] the maximum number of transactions to get.
   */
  service.get = function(options, callback) {
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || angular.noop;

    service.state.loading = true;
    $timeout(function() {
      payswarm.transactions.get({
        identity: identity.id,
        createdStart: options.createdStart || undefined,
        account: options.account || undefined,
        previous: options.previous || undefined,
        limit: options.limit || undefined,
        success: function(txns) {
          var account = options.account || null;
          if(!(account in service.accounts)) {
            service.accounts[account] = [];
          }
          _replaceArray(service.accounts[account], txns);
          expires = +new Date() + maxAge;
          service.state.loading = false;
          callback(null, txns);
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

  // get all recent transactions for an identity
  service.getRecent = function(options, callback) {
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || angular.noop;

    if(options.force || +new Date() >= expires) {
      service.state.loading = true;
      $timeout(function() {
        payswarm.transactions.get({
          // FIXME: make date ordering explicit
          identity: identity.id,
          limit: 10,
          success: function(txns) {
            var recent = [];
            angular.forEach(txns, function(txn) {
              // skip txns w/insufficent funds
              if(!(txn.voided &&
                txn.voidReason === 'payswarm.financial.InsufficientFunds')) {
                recent.push(txn);
              }
            });
            _replaceArray(service.recentTxns, recent);
            expires = +new Date() + maxAge;
            service.state.loading = false;
            callback(null, service.recentTxns);
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
        callback(null, service.recentTxns);
      });
    }
  };

  // get string for type of transaction
  service.getType = function(txn) {
    if(txn.type.indexOf('Deposit') !== -1) {
      return 'deposit';
    }
    else if(txn.type.indexOf('Contract') !== -1) {
      return 'contract';
    }
    else if(txn.type.indexOf('Transfer') !== -1) {
      return 'transfer';
    }
    else if(txn.type.indexOf('Withdrawal') !== -1) {
      return 'withdrawal';
    }
    else {
      return 'error';
    }
  };

  return service;
})
.factory('svcPromo', function($rootScope, svcAccount, svcTransaction) {
  // promo service
  var service = {};

  service.state = {
    loading: false
  };

  // redeem a promo code
  service.redeemCode = function(code, account, callback) {
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.promos.redeemCode({
      promoCode: code,
      account: account,
      success: function(promo) {
        service.state.loading = false;
        // refresh related account
        svcAccount.getOne(account, function(err) {
          callback(err, promo);
          // refresh latest transactions
          svcTransaction.getRecent({force: true});
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
.factory('svcHostedAsset', function(
  $timeout, $rootScope, svcIdentity, svcHostedListing) {
  // hosted asset service
  var service = {};

  var identity = svcIdentity.identity;
  var expires = 0;
  var maxAge = 1000*60*2;
  service.recentAssets = [];
  service.state = {
    loading: false
  };

  /**
   * Gets the hosted assets for an identity.
   *
   * @param options the options to use:
   *          [identity] the identity to get the hosted assets for.
   *          [storage] an array to update w/the assets.
   *          [delay] a timeout to wait before fetching assets.
   *          [createdStart] the creation start date.
   *          [keywords] any keywords to do the look up by.
   *          [previous] the previous asset (for pagination).
   *          [limit] the maximum number of assets to get.
   *          [assetContent] the asset content URL for the assets to get.
   */
  service.get = function(options, callback) {
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || angular.noop;

    service.state.loading = true;
    $timeout(function() {
      payswarm.hosted.assets.get({
        identity: options.identity || identity.id,
        createdStart: options.createdStart || undefined,
        keywords: options.keywords || undefined,
        previous: options.previous || undefined,
        limit: options.limit || undefined,
        assetContent: options.assetContent || undefined,
        success: function(assets) {
          if(options.storage) {
            _replaceArray(options.storage, assets);
          }
          expires = +new Date() + maxAge;
          service.state.loading = false;
          callback(null, options.storage || assets);
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

  // get all recent hosted assets for an identity
  service.getRecent = function(options, callback) {
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || angular.noop;

    if(options.force || +new Date() >= expires) {
      service.state.loading = true;
      $timeout(function() {
        payswarm.hosted.assets.get({
          // FIXME: make date ordering explicit
          identity: identity.id,
          limit: 10,
          success: function(assets) {
            _replaceArray(service.recentAssets, assets);
            expires = +new Date() + maxAge;
            service.state.loading = false;
            callback(null, service.recentAssets);
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
        callback(null, service.recentAssets);
      });
    }
  };

  // get a single asset
  service.getOne = function(assetId, options, callback) {
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || angular.noop;

    service.state.loading = true;
    $timeout(function() {
      payswarm.hosted.assets.getOne({
        asset: assetId,
        success: function(asset) {
          if(options.storage) {
            _replaceInArray(options.storage, asset);
          }
          service.state.loading = false;
          callback(null, asset);
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

  // add a new asset
  service.add = function(asset, options, callback) {
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || angular.noop;

    service.state.loading = true;
    payswarm.hosted.assets.add({
      identity: identity.id,
      asset: asset,
      success: function(asset) {
        if(options.storage) {
          options.storage.push(asset);
        }
        service.getRecent({force: true}, function() {
          callback(null, asset);
          $rootScope.$apply();
        });
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
        $rootScope.$apply();
      }
    });
  };

  // update an asset
  service.update = function(asset, callback) {
    service.state.loading = true;
    payswarm.hosted.assets.update({
      identity: identity.id,
      asset: asset,
      success: function() {
        service.getRecent({force: true}, function() {
          svcHostedListing.getRecent({force: true}, function() {
            // get asset
            service.getOne(asset.id, callback);
          });
        });
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
        $rootScope.$apply();
      }
    });
  };

  // set an asset's public key
  service.setKey = function(assetId, publicKey, callback) {
    service.state.loading = true;
    payswarm.hosted.assets.setKey({
      assetId: assetId,
      publicKey: publicKey,
      success: function() {
        // FIXME: track which assets have a public key set?
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
.factory('svcHostedListing', function($timeout, $rootScope, svcIdentity) {
  // hosted listing service
  var service = {};

  var identity = svcIdentity.identity;
  var expires = 0;
  var maxAge = 1000*60*2;
  service.recentListings = [];
  service.state = {
    loading: false
  };

  /**
   * Gets the hosted listings for an identity.
   *
   * @param options the options to use:
   *          [identity] the identity to get the hosted listings for.
   *          [storage] an array to update w/the listings.
   *          [delay] a timeout to wait before fetching listings.
   *          [createdStart] the creation start date.
   *          [keywords] any keywords to do the look up by.
   *          [asset] the asset to get the listings for.
   *          [previous] the previous listing (for pagination).
   *          [limit] the maximum number of listings to get.
   *          [includeAsset] true if the asset information should be embedded
   *            in any results, false if not (default: true).
   */
  service.get = function(options, callback) {
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || angular.noop;

    service.state.loading = true;
    $timeout(function() {
      payswarm.hosted.listings.get({
        identity: options.identity || identity.id,
        createdStart: options.createdStart || undefined,
        keywords: options.keywords || undefined,
        asset: options.asset || undefined,
        previous: options.previous || undefined,
        limit: options.limit || undefined,
        includeAsset: ('includeAsset' in options) ?
          options.includeAsset : undefined,
        success: function(listings) {
          if(options.storage) {
            _replaceArray(options.storage, listings);
          }
          expires = +new Date() + maxAge;
          service.state.loading = false;
          callback(null, options.storage || listings);
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

  // get all recent hosted listings for an identity
  service.getRecent = function(options, callback) {
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || angular.noop;

    if(options.force || +new Date() >= expires) {
      service.state.loading = true;
      $timeout(function() {
        payswarm.hosted.listings.get({
          // FIXME: make date ordering explicit
          identity: identity.id,
          limit: 10,
          includeAsset: options.includeAsset || undefined,
          success: function(listings) {
            _replaceArray(service.recentListings, listings);
            expires = +new Date() + maxAge;
            service.state.loading = false;
            callback(null, service.recentListings);
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
        callback(null, service.recentListings);
      });
    }
  };

  // get a single listing
  service.getOne = function(listingId, options, callback) {
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || angular.noop;

    service.state.loading = true;
    $timeout(function() {
      payswarm.hosted.listings.getOne({
        listing: listingId,
        success: function(listing) {
          if(options.storage) {
            _replaceInArray(options.storage, listing);
          }
          service.state.loading = false;
          callback(null, listing);
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

  // add a new listing
  service.add = function(listing, options, callback) {
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || angular.noop;

    service.state.loading = true;
    payswarm.hosted.listings.add({
      identity: identity.id,
      listing: listing,
      success: function(listing) {
        if(options.storage) {
          options.storage.push(listing);
        }
        service.getRecent({force: true}, function() {
          callback(null, listing);
          $rootScope.$apply();
        });
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
        $rootScope.$apply();
      }
    });
  };

  // update a listing
  service.update = function(listing, callback) {
    service.state.loading = true;
    payswarm.hosted.listings.update({
      identity: identity.id,
      listing: listing,
      success: function() {
        service.getRecent({force: true}, function() {
          // get listing
          service.getOne(listing.id, callback);
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
.factory('svcModal', function(
  $compile, $controller, $rootScope, $templateCache, svcTemplateCache) {
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

  // destroy top modal when escape is pressed
  $(document).keyup(function(e) {
    if(e.keyCode === 27) {
      e.stopPropagation();
      if(modals.length > 0) {
        modals[modals.length - 1]._angular.destroy(true);
      }
    }
  });

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
   *          [link] optional link function for the modal, where 'attrs' uses
   *            the directive's attributes object.
   *
   * @return the directive configuration.
   */
  service.directive = function(options) {
    var isolatedScope = {
      visible: '=modalVisible',
      _callback: '&modalOnClose'
    };
    if('name' in options) {
      isolatedScope.visible = '=modal' + options.name;
    }
    angular.extend(isolatedScope, options.scope || {});
    options.controller = options.controller || angular.noop;
    options.link = options.link || angular.noop;
    return {
      scope: isolatedScope,
      transclude: options.transclude || false,
      compile: function(tElement, tAttrs, transcludeLinker) {
        // link function
        return function(scope, element, attrs) {
          // pre-fetch modal template
          svcTemplateCache.get(options.templateUrl, function(err, data) {
            // create modal when visible is true, destroy when false
            var modal = null;
            scope.$watch('visible', function(value) {
              if(value) {
                modal = createModal(options, scope, attrs, transcludeLinker);
              }
              else if(modal) {
                modal._angular.destroy();
              }
            });

            // setup directive scope modal vars
            scope.modal = scope.modal || {};

            // ignore enter presses in the modal by default
            scope.modal.allowEnter = attrs.modalEnter || false;

            // does any custom init work when modal opens
            scope.modal.open = scope.modal.open || angular.noop;

            // closes and destroys modal on success
            scope.modal.close = function(err, result) {
              scope.modal.error = err;
              scope.modal.result = result;
              scope.modal.success = true;
              if(modal) {
                modal._angular.destroy();
              }
            };
          });
        };
      }
    };
  };

  /**
   * Creates and opens the modal.
   *
   * @param options the directive options.
   * @param directiveScope the directive's scope.
   * @param attrs the directive element's attributes.
   * @param transcludeLinker the directive's transclusion linker function.
   *
   * @return the modal.
   */
  function createModal(options, directiveScope, attrs, transcludeLinker) {
    // create child scope for modal
    var childScope = directiveScope.$new();
    var transcludeFn = function(scope, cloneAttachFn) {
      // link and attach transcluded elements
      var clone = transcludeLinker(
        directiveScope.$parent.$new(), function(clone) {
        cloneAttachFn(clone);
      });
      return clone;
    };

    // create new modal element
    var element = $($templateCache.get(options.templateUrl)[1]);
    $compile(element, transcludeFn)(childScope);

    // initialize modal
    element.addClass('hide');
    element.modal(modalOptions);
    var modal = element.data('modal');

    // make modal full-screen scrollable
    var _backdrop = modal.backdrop;
    modal.backdrop = function(callback) {
      callback = callback || angular.noop;
      _backdrop.call(modal, callback);

      // replace click handler on backdrop because backdrop element
      // now contains the modal
      if(modal.isShown && modal.options.backdrop) {
        modal.$backdrop.unbind('click');
        modal.$backdrop.click(function(event) {
          // only focus/hide if the click is on the backdrop itself
          if(event.target === modal.$backdrop[0]) {
            (modal.options.backdrop === 'static' ?
              element.focus() : modal.hide());
          }
        });
      }

      // create modal wrapper
      if(modal.isShown && modal.options.backdrop) {
        var $elementWrapper = $('<div class="modal-wrapper" />');
        $elementWrapper.prependTo(modal.$backdrop);
        element.prependTo($elementWrapper);

        // disable background scrolling
        $('body').css({overflow: 'hidden'});
      }
    };
    var _removeBackdrop = modal.removeBackdrop;
    modal.removeBackdrop = function() {
      element.insertAfter(modal.$backdrop);
      _removeBackdrop.call(modal);

      // re-enable background scrolling if modal is not stacked
      if(!modal._angular.parent && !modal._angular.hasChild) {
        $('body').css({overflow: 'auto'});
      }

      // needed here because insertAfter is required for stacked modals
      // even after the element has been removed from the dom due to destroy
      if(modal._angular.destroyed) {
        element.remove();
      }
    };

    // additional angular API on bootstrap modal
    modal._angular = {};

    /** Run modal controller and show the modal. */
    modal._angular.openAndShow = function() {
      // create modal controller
      var locals = {
        $scope: childScope,
        $element: element,
        $attrs: attrs,
        $transclude: transcludeFn
      };
      modal._angular.controller = $controller(options.controller, locals);

      // do custom linking on modal element
      options.link(childScope, element, attrs);

      // only do fade transition if no parent
      if(!modal._angular.parent) {
        // firefox animations are broken
        if(!$.browser.mozilla) {
          element.addClass('fade');
        }
      }
      element.modal('show');
    };

    /** Shortcut to show modal. */
    modal._angular.show = function() {
      element.modal('show');
    };

    /** Shortcut to hide modal. */
    modal._angular.hide = function() {
      element.modal('hide');
    };

    /**
     * Destroys a modal.
     *
     * @param doApply true if a digest is required.
     */
    modal._angular.destroy = function(doApply) {
      // only destroy once
      if(modal._angular.destroyed) {
        return;
      }
      modal._angular.destroyed = true;

      // remove modal from stack, notify directive of visibility change
      modals.pop();
      directiveScope.visible = false;

      // set error to canceled if success is not set
      if(!directiveScope.modal.error && !directiveScope.modal.success) {
        directiveScope.modal.error = 'canceled';
      }

      // only do fade transition when no parent
      if(!modal._angular.parent) {
        // firefox animations are broken
        if(!$.browser.mozilla) {
          element.addClass('fade');
        }
      }
      // hide modal
      modal._angular.hide();

      // call directive scope's callback
      if(directiveScope._callback) {
        directiveScope._callback.call(directiveScope, {
          err: directiveScope.modal.error,
          result: directiveScope.modal.result
        });
      }

      if(doApply) {
        $rootScope.$apply();
      }
    };

    /** Note: Code below prepares and opens newly created modal. */

    // reinit directive scope
    directiveScope.modal.success = false;
    directiveScope.modal.error = null;
    directiveScope.modal.result = null;

    // handle enter key
    element.keypress(function(e) {
      if(e.keyCode === 13 && !directiveScope.modal.allowEnter) {
        e.preventDefault();
      }
    });

    // close modal when it is hidden and has no child
    element.on('hide', function() {
      if(!modal._angular.hasChild) {
        modal._angular.destroy(true);
      }
    });

    element.on('shown', function() {
      // firefox animations are broken
      if(!$.browser.mozilla) {
        // prevent auto fade transition on next hide
        element.removeClass('fade');
      }
    });
    element.on('hidden', function() {
      // firefox animations are broken
      if(!$.browser.mozilla) {
        // prevent auto fade transition on next show
        element.removeClass('fade');
      }

      // show parent when hidden and no child
      if(modal._angular.parent && !modal._angular.hasChild) {
        modal._angular.parent._angular.hasChild = false;
        modal._angular.parent._angular.show();
      }

      if(modal._angular.destroyed) {
        element.remove();
      }
    });

    // auto-bind any .btn-close classes here
    $('.btn-close', element).click(function(e) {
      e.preventDefault();
      modal._angular.destroy(true);
    });

    // get the parent modal, if any
    var parent = (modals.length > 0) ? modals[modals.length - 1] : null;

    // add modal to stack
    modal._angular.parent = parent;
    modal._angular.hasChild = false;
    modals.push(modal);

    if(parent) {
      // hide parent first, then show child
      parent._angular.hasChild = true;
      parent.$element.one('hidden', function() {
        modal._angular.openAndShow();
      });
      parent._angular.hide();
    }
    else {
      modal._angular.openAndShow();
    }

    return modal;
  }

  return service;
});

function _replace(dst, src) {
  if(dst !== src) {
    angular.forEach(dst, function(dstValue, key) {
      if(!(key in src)) {
        // preserve $$hashKey, needed for ng-repeat directives
        if(key !== '$$hashKey') {
          delete dst[key];
        }
      }
      else {
        // do deep replacement
        var srcValue = src[key];
        if(angular.isArray(dstValue) && angular.isArray(srcValue)) {
          // assumes 'id' property means value match
          _replaceArray(dstValue, srcValue);
        }
        else if(angular.isObject(dstValue) && angular.isObject(srcValue)) {
          _replace(dstValue, srcValue);
        }
        else {
          dst[key] = srcValue;
        }
      }
    });
    angular.forEach(src, function(srcValue, key) {
      if(!(key in dst)) {
        dst[key] = srcValue;
      }
    });
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
