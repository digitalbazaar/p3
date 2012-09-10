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
.factory('svcAddress', function($timeout) {
  // address service
  var service = {};

  var identity = window.data.session.identity;
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

    if(options.force || +new Date() >= expires) {
      service.state.loading = true;
      payswarm.addresses.get({
        identity: identity.id,
        success: function(addresses) {
          service.addresses.splice(0, service.addresses.length);
          angular.forEach(addresses, function(address) {
            service.addresses.push(address);
          });
          expires = +new Date() + maxAge;
          service.state.loading = false;
          callback(null, service.addresses);
        },
        error: function(err) {
          service.state.loading = false;
          callback(err);
        }
      });
    }
    else {
      $timeout(function() {
        callback(null, service.addresses);
      });
    }
  };

  // validate an address
  service.validate = function(address, callback) {
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
    service.state.loading = true;
    payswarm.addresses.add({
      identity: identity.id,
      address: address,
      success: function(address) {
        service.addresses.push(address);
        service.state.loading = false;
        callback(null, address);
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
      }
    });
  };

  // delete an address by label
  service.del = function(address, callback) {
    service.state.loading = true;
    payswarm.addresses.del({
      identity: identity.id,
      addressId: address.label,
      success: function() {
        for(var i = 0; i < service.addresses.length;) {
          var address_ = service.addresses[i];
          if(address_.label === address.label) {
            service.addresses.splice(i, 1);
          }
          else {
            i += 1;
          }
        }
        service.state.loading = false;
        callback();
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
      }
    });
  };

  return service;
})
.factory('svcAccount', function($timeout) {
  // accounts service
  var service = {};

  var identity = window.data.session.identity;
  var maxAge = 1000*60*2;
  service.identities = {};
  angular.forEach(window.data.session.identities, function(identity) {
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
      payswarm.accounts.get({
        identity: options.identity || identity.id,
        success: function(accounts) {
          entry.accounts.splice(0, entry.accounts.length);
          angular.forEach(accounts, function(account) {
            entry.accounts.push(account);
          });
          entry.expires = +new Date() + maxAge;
          callback(null, entry.accounts);
        },
        error: callback
      });
    }
    else {
      $timeout(function() {
        callback(null, entry.accounts);
      });
    }
  };

  // get a single account
  service.getOne = function(accountId, callback) {
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.accounts.getOne({
      account: accountId,
      success: function(account) {
        var added = false;
        for(var i = 0; !added && i < service.accounts.length; ++i) {
          var account_ = service.accounts[i];
          if(account_.id === accountId) {
            service.accounts[i] = account;
            added = true;
          }
        }
        if(!added) {
          service.accounts.push(account);
        }
        service.state.loading = false;
        callback(null, account);
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
      }
    });
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
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
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
      }
    });
  };

  return service;
})
.factory('svcBudget', function($timeout) {
  // budgets service
  var service = {};

  var identity = window.data.session.identity;
  var expires = 0;
  var maxAge = 1000*60*2;
  service.budgets = [];
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
      payswarm.budgets.get({
        identity: identity.id,
        success: function(budgets) {
          service.budgets.splice(0, service.budgets.length);
          angular.forEach(budgets, function(budget) {
            service.budgets.push(budget);
          });
          expires = +new Date() + maxAge;
          service.state.loading = false;
          callback(null, service.budgets);
        },
        error: function(err) {
          service.state.loading = false;
          callback(err);
        }
      });
    }
    else {
      $timeout(function() {
        callback(null, service.budgets);
      });
    }
  };

  // get a single budget
  service.getOne = function(budgetId, callback) {
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.budgets.getOne({
      budget: budgetId,
      success: function(budget) {
        var added = false;
        for(var i = 0; !added && i < service.budgets.length; ++i) {
          var budget_ = service.budgets[i];
          if(budget_.id === budgetId) {
            service.budgets[i] = budget;
            added = true;
          }
        }
        if(!added) {
          service.budgets.push(budget);
        }
        service.state.loading = false;
        callback(null, budget);
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
      }
    });
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
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
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
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
      }
    });
  };

  // deletes a budget
  service.del = function(budgetId, callback) {
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.budgets.del({
      budget: budgetId,
      success: function() {
        for(var i = 0; i < service.budgets.length; ++i) {
          if(service.budgets[i].id === budget.id) {
            service.budgets.splice(i, 1);
            break;
          }
        }
        service.state.loading = false;
        callback();
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
      }
    });
  };

  return service;
})
.factory('svcPaymentToken', function($timeout) {
  // paymentTokens service
  var service = {};

  var identity = window.data.session.identity;
  var expires = 0;
  var maxAge = 1000*60*2;
  service.state = {
    loading: false
  };
  // all tokens indexed by id
  service._paymentTokens = {};
  // type specific tokens
  service.creditCards = [];
  service.bankAccounts = [];

  function updateTokens(paymentTokens) {
    // update card and bank tokens
    service.creditCards.splice(0, service.creditCards.length);
    service.bankAccounts.splice(0, service.bankAccounts.length);
    angular.forEach(service._paymentTokens, function(token) {
      if(token.paymentMethod === 'ccard:CreditCard') {
        service.creditCards.push(token);
      }
      else if(token.paymentMethod === 'bank:BankAccount') {
        service.bankAccounts.push(token);
      }
    });
  }

  function _setToken(token) {
    service._paymentTokens[token.id] = token;
    updateTokens();
  }

  function _setTokens(tokens) {
    service._paymentTokens = {};
    angular.forEach(tokens, function(token) {
      _setToken(token);
    });
    updateTokens();
  }

  function _delToken(tokenId) {
    delete service._paymentTokens[tokenId];
    updateTokens();
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
      payswarm.paymentTokens.get({
        identity: identity.id,
        success: function(paymentTokens) {
          _setTokens(paymentTokens);
          expires = +new Date() + maxAge;
          service.state.loading = false;
          callback(null, service.paymentTokens);
        },
        error: function(err) {
          service.state.loading = false;
          callback(err);
        }
      });
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
        _setToken(paymentToken);
        service.state.loading = false;
        callback(null, paymentToken);
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
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
        _setToken(paymentToken);
        service.state.loading = false;
        callback(null, paymentToken);
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
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
      success: function() {
        _delToken(paymentTokenId);
        service.state.loading = false;
        callback();
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
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
    element.addClass('hide fade');
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
    function show(doApply) {
      scope.open();
      if(doApply) {
        scope.$apply();
      }
      element.modal('show');
    };

    if(parent) {
      // hide parent first, then show child
      parent.hasChild = true;
      parent.element.one('hidden', function() {
        show(true);
      });
      parent.element.modal('hide');
    }
    else {
      show(false);
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
        modal.parent.hasChild = false;
        modal.parent.element.modal('show');
      });
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

})(jQuery);
