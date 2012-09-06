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
.factory('svcAddress', function() {
  // address service
  var service = {};

  var identity = window.data.identity;
  var expires = 0;
  var maxAge = 1000*60*2;
  service.addresses = [];

  // get all addresses for an identity
  service.get = function(options, callback) {
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }

    if(options.force || +new Date() >= expires) {
      payswarm.addresses.get({
        identity: identity,
        success: function(addresses) {
          service.addresses.splice(0, service.addresses.length);
          angular.forEach(addresses, function(address) {
            service.addresses.push(address);
          });
          expires = +new Date() + maxAge;
          callback(null, service.addresses);
        },
        error: callback
      });
    }
  };

  // validate an address
  service.validate = function(address, callback) {
    payswarm.addresses.validate({
      identity: identity,
      address: address,
      success: function(validated) {
        callback(null, validated);
      },
      error: callback
    });
  };

  // add a new address
  service.add = function(address, callback) {
    payswarm.addresses.add({
      identity: identity,
      address: address,
      success: function(address) {
        service.addresses.push(address);
        callback(null, address);
      },
      error: callback
    });
  };

  // delete an address by label
  service.del = function(address, callback) {
    payswarm.addresses.del({
      identity: identity,
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
        callback();
      },
      error: callback
    });
  };

  return service;
})
.factory('svcAccount', function() {
  // accounts service
  var service = {};

  var identity = window.data.identity;
  var expires = 0;
  var maxAge = 1000*60*2;
  service.accounts = [];

  // get all accounts for an identity
  service.get = function(options, callback) {
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }

    if(options.force || +new Date() >= expires) {
      payswarm.accounts.get({
        identity: identity,
        success: function(accounts) {
          service.accounts.splice(0, service.accounts.length);
          angular.forEach(accounts, function(account) {
            service.accounts.push(account);
          });
          expires = +new Date() + maxAge;
          callback(null, service.accounts);
        },
        error: callback
      });
    }
  };

  // get a single account
  service.getOne = function(accountId, callback) {
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
        callback(null, account);
      },
      error: callback
    });
  };

  // add a new account
  service.add = function(account, callback) {
    payswarm.accounts.add({
      identity: identity,
      account: account,
      success: function(account) {
        service.accounts.push(account);
        callback(null, account);
      },
      error: callback
    });
  };

  // update an account
  service.update = function(account, callback) {
    payswarm.accounts.update({
      identity: identity,
      account: account,
      success: function() {
        // get account
        service.getOne(account.id, callback);
      },
      error: callback
    });
  };

  return service;
})
.factory('svcBudget', function() {
  // budgets service
  var service = {};

  var identity = window.data.identity;
  var expires = 0;
  var maxAge = 1000*60*2;
  service.budgets = [];

  // get all budgets for an identity
  service.get = function(options, callback) {
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }

    if(options.force || +new Date() >= expires) {
      payswarm.budgets.get({
        identity: identity,
        success: function(budgets) {
          service.budgets.splice(0, service.budgets.length);
          angular.forEach(budgets, function(budget) {
            service.budgets.push(budget);
          });
          expires = +new Date() + maxAge;
          callback(null, service.budgets);
        },
        error: callback
      });
    }
  };

  // get a single budget
  service.getOne = function(budgetId, callback) {
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
        callback(null, budget);
      },
      error: callback
    });
  };

  // add a new budget
  service.add = function(budget, callback) {
    payswarm.budgets.add({
      identity: identity,
      budget: budget,
      success: function(budget) {
        service.budgets.push(budget);
        callback(null, budget);
      },
      error: callback
    });
  };

  // update a budget
  service.update = function(budget, callback) {
    payswarm.budgets.update({
      identity: identity,
      budget: budget,
      success: function() {
        // get budget
        service.getOne(budget.id, callback);
      },
      error: callback
    });
  };

  // add a vendor to a budget
  service.addVendor = function(budgetId, vendorId, callback) {
    payswarm.budgets.addVendor({
      budget: budgetId,
      vendor: vendorId,
      success: callback,
      error: callback
    });
  };

  // deletes a budget
  service.del = function(budgetId, callback) {
    payswarm.budgets.del({
      budget: budgetId,
      success: callback,
      error: callback
    });
  };

  return service;
})
.factory('svcPaymentToken', function() {
  // paymentTokens service
  var service = {};

  var identity = window.data.identity;
  var expires = 0;
  var maxAge = 1000*60*2;
  service.paymentTokens = [];

  // get all paymentTokens for an identity
  service.get = function(options, callback) {
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }

    if(options.force || +new Date() >= expires) {
      payswarm.paymentTokens.get({
        identity: identity,
        success: function(paymentTokens) {
          service.paymentTokens.splice(0, service.paymentTokens.length);
          angular.forEach(paymentTokens, function(paymentToken) {
            service.paymentTokens.push(paymentToken);
          });
          expires = +new Date() + maxAge;
          callback(null, service.paymentTokens);
        },
        error: callback
      });
    }
  };

  // add a new paymentToken
  service.add = function(paymentToken, callback) {
    payswarm.paymentTokens.add({
      identity: identity,
      paymentToken: paymentToken,
      success: function(paymentToken) {
        service.paymentTokens.push(paymentToken);
        callback(null, paymentToken);
      },
      error: callback
    });
  };

  // deletes a paymentToken
  service.del = function(paymentTokenId, callback) {
    payswarm.paymentTokens.del({
      budget: paymentTokenId,
      success: callback,
      error: callback
    });
  };

  return service;
})
.factory('svcModal', function() {
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

    if(parent) {
      // hide parent first, then show child
      parent.hasChild = true;
      parent.element.one('hidden', function() {
        element.modal('show');
      });
      parent.element.modal('hide');
    }
    else {
      // show modal
      element.modal('show');
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
