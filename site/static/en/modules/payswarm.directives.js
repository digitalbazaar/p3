/*!
 * PaySwarm Angular Directives
 *
 * @requires jQuery v1.7+ (http://jquery.com/)
 *
 * @author Dave Longley
 */
(function($) {

angular.module('payswarm.directives')
.directive('spinner', function() {
  return {
    scope: {
      spin: '=spinner',
      className: '@spinnerClass'
    },
    link: function(scope, element, attrs) {
      // default spinner options
      var options = {
        lines: 11, // The number of lines to draw
        length: 3, // The length of each line
        width: 3, // The line thickness
        radius: 5, // The radius of the inner circle
        rotate: 0, // The rotation offset
        color: '#000', // #rgb or #rrggbb
        speed: 1.0, // Rounds per second
        trail: 100, // Afterglow percentage
        shadow: false, // Whether to render a shadow
        hwaccel: false, // Whether to use hardware acceleration
        className: 'inline-block', // CSS class for spinner
        top: 'auto', // Top position relative to parent in px
        left: 'auto' // Left position relative to parent in px
      };

      // create spinner
      var spinner = new Spinner(options);

      scope.$watch('spin', function(value) {
        if(value) {
          spinner.spin();
          element.append(spinner.el);
        }
        else {
          spinner.stop();
        }
      });

      attrs.$observe('spinnerClass', function(value) {
        options.className = value;
        spinner.stop();
        spinner = new Spinner(options);
        if(scope.spin) {
          spinner.spin();
          element.append(spinner.el);
        }
      });

      // stop spinning if element is destroyed
      element.bind('$destroy', function() {
        spinner.stop();
      });
    }
  };
})
.directive('submitForm', function() {
  return function(scope, element, attrs) {
    // manually prevent form default action
    element.closest('form').bind('submit', function(e) {
      e.preventDefault();
    });

    // submit form on button click or enter press
    element.bind('click', function(e) {
      e.preventDefault();
      element.closest('form').submit();
    });
    $(':input', element.closest('form')).bind('keypress', function(e) {
      if(e.which === 13) {
        e.preventDefault();
        element.closest('form').submit();
      }
    });
  };
})
.directive('slugIn', function($filter) {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function(scope, element, attrs, ngModel) {
      var slug = $filter('slug');
      ngModel.$parsers.push(function(v) {
        return slug(v);
      });
    }
  };
})
.directive('slugOut', function($filter) {
  return {
    restrict: 'A',
    require: 'ngModel',
    scope: {
      ngModel: '=',
      slugOut: '='
    },
    link: function(scope, element, attrs) {
      scope.$watch('ngModel', function(value) {
        element.val(value);
      });

      var slug = $filter('slug');
      element.on('propertychange input keyup paste', function(e) {
        scope.ngModel = element.val();
        scope.slugOut = slug(scope.ngModel);
        scope.$apply();
      });
    }
  };
})
.directive('fadeout', function($parse) {
  return {
    link: function(scope, element, attrs) {
      scope.$watch(attrs.fadeout, function(value) {
        if(value) {
          element.fadeOut(function() {
            element.remove();
            var exp = $parse(attrs.fadeoutCallback);
            exp(scope);
          });
        }
      });
    }
  };
})
.directive('progressDividend', function() {
  return function(scope, element, attrs) {
    function updateClass(divisor, dividend) {
      var class_;
      var p = Math.round(parseFloat(divisor) / parseFloat(dividend) * 100);
      if(p < 25) {
        class_ = 'progress-danger';
      }
      else if(p < 50) {
        class_ = 'progress-warning';
      }
      else {
        class_ = 'progress-success';
      }
      element
        .removeClass('progress-danger')
        .removeClass('progress-info')
        .removeClass('progress-success')
        .addClass(class_);
    }

    scope.$watch(attrs.progressDivisor, function(value) {
      updateClass(value, scope.$eval(attrs.progressDividend));
    });
    scope.$watch(attrs.progressDividend, function(value) {
      updateClass(scope.$eval(attrs.progressDivisor), value);
    });
  };
})
.directive('barDividend', function() {
  return function(scope, element, attrs) {
    function updateBarWidth(divisor, dividend) {
      var p = Math.round(parseFloat(divisor) / parseFloat(dividend) * 100);
      element.css('width', p + '%');
    }

    scope.$watch(attrs.barDivisor, function(value) {
      updateBarWidth(value, scope.$eval(attrs.barDividend));
    });
    scope.$watch(attrs.barDividend, function(value) {
      updateBarWidth(scope.$eval(attrs.barDivisor), value);
    });
  };
})
.directive('creditCardSelector', function() {
  return {
    scope: {
      number: '=creditCardSelector',
      brand: '=creditCardBrand'
    },
    template: [
      '<span><span name="left"></span>',
      '<span name="center"></span>',
      '<span name="right"></span></span>'].join(''),
    replace: true,
    link: function(scope, element, attrs) {
      scope.$watch('number', function(value) {
        var logo = 'all';
        scope.brand = null;

        if(/^4/.test(value)) {
          logo = 'visa';
          scope.brand = 'ccard:Visa';
        }
        else if(/^5[1-5]/.test(value)) {
          logo = 'mastercard';
          scope.brand = 'ccard:MasterCard';
        }
        else if(/^3[47]/.test(value)) {
          logo = 'amex';
          scope.brand = 'ccard:AmericanExpress';
        }
        // 6011, 622126-622925, 644-649, 65
        else if(/^(6((011)|(22((1((2[6-9])|([3-9]{1}[0-9])))|([2-8])|(9(([0-1]{1}[0-9])|(2[0-5])))))|(4[4-9])|5))/.test(value)) {
          logo = 'discover';
          scope.brand = 'ccard:Discover';
        }
        else if(/^62/.test(value)) {
          logo = 'china-up';
          scope.brand = 'ccard:ChinaUnionPay';
        }

        // remove old cc-logo classes
        element.children().removeClass(function(index, css) {
          return (css.match (/\bcc-logo-\S+/g) || []).join(' ');
        });

        // add new classes
        if(!scope.brand) {
          $('[name="left"]', element).addClass('cc-logo-all');
        }
        else {
          logo = 'cc-logo-' + logo;
          $('[name="left"]', element).addClass(logo + '-left');
          $('[name="center"]', element).addClass(logo + ' cc-logo-selected');
          $('[name="right"]', element).addClass(logo + '-right');
        }
      });
    }
  };
})
.directive('duplicateChecker', function($http, $filter) {
  return {
    restrict: 'A',
    scope: {
      input: '=duplicateChecker',
      type: '@duplicateCheckerType',
      available: '@duplicateCheckerAvailable',
      invalid: '@duplicateCheckerInvalid',
      taken: '@duplicateCheckerTaken',
      checking: '@duplicateCheckerChecking',
      owner: '@duplicateCheckerOwner'
    },
    link: function(scope, element, attrs) {
      // hide feedback until input changes
      element.addClass('alert').hide();

      var lastInput = null;
      var timer = null;
      var init = true;

      scope.$watch('input', function(value) {
        if(init) {
          // do not consider initialized until value is defined
          if(value !== undefined) {
            init = false;
          }
          return;
        }

        // stop previous check
        clearTimeout(timer);

        // nothing to check
        if(value === undefined || value.length === 0) {
          element.hide();
        }
        else if(value !== lastInput) {
          // show checking
          element
            .removeClass('alert-error alert-success')
            .text(scope.checking)
            .fadeIn('show');
          lastInput = null;

          // start timer to check
          timer = setTimeout(function() {
            if(value.length === 0) {
              element.hide();
            }
            else {
              lastCheck = $filter('slug')(scope.input);
              timer = null;
              $http.post('/identifier', $.extend({
                type: attrs.duplicateCheckerType,
                psaSlug: lastCheck
              }, scope.owner ? {owner: scope.owner} : {}))
                .success(function() {
                  // available
                  element
                    .hide()
                    .removeClass('alert-error alert-success')
                    .addClass('alert-success')
                    .text(scope.available)
                    .fadeIn('slow');
                })
                .error(function(data, status) {
                  element.hide().removeClass('alert-error alert-success');
                  if(status === 400) {
                    // invalid
                    element
                      .text(scope.invalid)
                      .addClass('alert-error')
                      .fadeIn('slow');
                  }
                  else if(status === 409) {
                    element
                      .text(scope.taken)
                      .addClass('alert-error')
                      .fadeIn('slow');
                  }
                  else {
                    // FIXME: report server errors
                  }
                });
            }
          }, 1000);
        }
      });
    }
  };
})
.directive('tooltipTitle', function($timeout) {
  return function(scope, element, attrs) {
    attrs.$observe('tooltipTitle', function(value) {
      if(element.data('tooltip')) {
        element.tooltip('hide');
        element.removeData('tooltip');
      }
      element.tooltip({
        title: value
      });
      // scroll tooltips in modals
      var tip = element.data('tooltip');
      tip.shown = false;
      var show = tip.show;
      tip.show = function() {
        show.call(tip);
        tip.shown = true;
        tip.top = parseInt(tip.tip().css('top'));
        tip.scrollTop = $('.modal-backdrop').scrollTop();
      };
      var hide = tip.hide;
      tip.hide = function() {
        hide.call(tip);
        tip.shown = false;
      };
    });
    attrs.$observe('tooltipShow', function(value) {
      if(value !== undefined) {
        if(value === 'true') {
          element.data('tooltip').show();
        }
        else {
          element.data('tooltip').hide();
        }
      }
    });
  };
})
.directive('popoverTemplate', function(svcTemplateCache, $compile, $timeout) {
  return {
    restrict: 'A',
    scope: {
      visible: '=popoverVisible',
      minWidth: '&popoverMinWidth'
    },
    controller: function($scope) {
      // manually inherit from parent scope because scope is auto-isolated
      // when inheriting 'visible' property w/another name
      for(var prop in $scope.$parent) {
        if($scope.$parent.hasOwnProperty(prop) &&
          !$scope.hasOwnProperty(prop) && prop[0] !== '$') {
          $scope[prop] = $scope.$parent[prop];
        }
      }
    },
    link: function(scope, element, attrs) {
      svcTemplateCache.get(attrs.popoverTemplate, function(err, data) {
        // initialize popover, toggle on click
        element.popover({
          content: data,
          trigger: 'manual',
          html: true
        }).click(function(e) {
          scope.visible = !scope.visible;
          scope.$apply();
        });

        // update popover content just once
        var once = false;
        var popover = element.data('popover');
        popover.setContent = function() {
          var tip = this.tip();
          tip.find('.popover-title').text(this.getTitle());
          if(!once) {
            tip.find('.popover-content').html(this.getContent());
            once = true;
          }
          tip.removeClass('fade top bottom left right in');
        };

        // compile and link popover when showing (must be done after the
        // popover is attached to the dom)
        var oldShow = popover.show;
        popover.show = function() {
          oldShow.call(popover);
          var tip = this.tip();

          // resize width to fix minimum width
          var minWidth = Math.max(
            scope.minWidth(tip) || 0, tip.outerWidth(true));
          tip.css({width: minWidth});

          // fix positioning for bottom popover
          if(popover.options.placement === 'bottom') {
            // set top position
            var pos = popover.getPosition(false);
            pos = {top: pos.top + pos.height};

            // calculate left position and position arrow
            var right = element.offset().left + element[0].offsetWidth;
            pos.left = right - tip[0].offsetWidth;
            $('.arrow', tip).css({
              left: tip[0].offsetWidth - element[0].offsetWidth / 2 - 1
            });
            tip.css(pos);
          }

          // compile and link tooltip to scope
          $compile(tip)(scope);

          // HACK: $timeout is only used here because the click that shows
          // the popover is being handled after it is shown which immediately
          // closes it
          $timeout(function() {
            // hide popover when clicking away
            $(document).one('click', hideOnClick);
          });
        };

        // hide popover if clicked-off
        function hideOnClick(e) {
          var tip = popover.tip();
          if($(e.target).closest(tip).length === 0) {
            scope.visible = false;
            scope.$apply();
          }
        }

        // watch for changes to visibility
        var visible = false;
        scope.$watch('visible', function(value) {
          if(value) {
            if(!visible) {
              visible = true;
              element.addClass('active');
              element.popover('show');
            }
          }
          else if(visible) {
            visible = false;
            element.removeClass('active');
            element.popover('hide');
            $(document).unbind('click', hideOnClick);
          }
        });
      });
    }
  };
})
.directive('selector', function($filter) {
  function Ctrl($scope) {
    $scope.$watch('selected', function(value) {
      if(value === undefined) {
        $scope.selected = $scope.items[0] || null;
      }
    });

    // builds an item grid for selectors w/grid layouts
    function buildGrid(columns) {
      var row = null;
      $scope.grid = [];
      var sorted = $filter('orderBy')($scope.items, 'label');
      angular.forEach(sorted, function(item) {
        if(!row) {
          row = [];
        }
        row.push(item);
        if(row.length === columns) {
          $scope.grid.push(row);
          row = null;
        }
      });
      if(row) {
        $scope.grid.push(row);
      }
    }

    // keep item grid up-to-date
    $scope.grid = [];
    $scope.$watch('items', function(value) {
      if($scope.columns !== undefined) {
        buildGrid(Math.max(1, parseInt($scope.columns)));
      }
    }, true);
    $scope.$watch('columns', function(value) {
      if(value !== undefined) {
        buildGrid(Math.max(1, parseInt(value)));
      }
    });

    // called when an item is selected in the selector modal
    $scope.select = function(selected) {
      $scope.selected = selected;
      $scope.showSelectorModal = false;
    };
  }

  function Link(scope, element, attrs) {
    attrs.$observe('fixed', function(value) {
      scope.fixed = value;
    });
    scope.$watch('showSelectorModal', function(value) {
      if(attrs.selecting) {
        scope.selecting = value;
      }
    });
  }

  return {
    transclude: true,
    scope: {
      fixed: '@',
      items: '=',
      itemType: '@',
      selected: '=',
      invalid: '=',
      addItem: '&',
      custom: '=customDisplay',
      selecting: '=',
      columns: '@'
    },
    controller: Ctrl,
    templateUrl: '/partials/selector.html',
    link: Link
  };
})
.directive('modalSelector', function(svcModal) {
  return svcModal.directive({
    name: 'Selector',
    scope: {
      items: '=',
      itemType: '='
    },
    transclude: true,
    templateUrl: '/partials/modals/selector.html'
  });
})
.directive('addressSelector', function() {
  function Ctrl($scope, svcAddress) {
    $scope.services = {
      address: svcAddress.state
    };
    $scope.addresses = svcAddress.addresses;
    $scope.$watch('addresses', function(addresses) {
      if(!$scope.selected || $.inArray($scope.selected, addresses) === -1) {
        $scope.selected = addresses[0] || null;
      }
    }, true);
    svcAddress.get();
  }

  return {
    scope: {
      selected: '=',
      invalid: '='
    },
    controller: Ctrl,
    templateUrl: '/partials/address-selector.html'
  };
})
.directive('accountSelector', function(svcAccount, svcIdentity) {
  function Ctrl($scope) {
    $scope.services = {
      account: svcAccount.state
    };
    $scope.identityId = svcIdentity.identity.id;
    updateAccounts($scope);
    $scope.$watch('accounts', function(accounts) {
      if(!$scope.selected || $.inArray($scope.selected, accounts) === -1) {
        $scope.selected = accounts[0] || null;
      }
    }, true);
  }

  function updateAccounts($scope) {
    var identityId = $scope.identityId;
    $scope.accounts = svcAccount.identities[identityId].accounts;
    svcAccount.get({identity: identityId});
  }

  function Link(scope, element, attrs) {
    attrs.$observe('fixed', function(value) {
      scope.fixed = value;
    });

    scope.$watch('selected.balance', function(value) {
      scope.invalid = false;
      scope.balanceTooLow = false;
      if(value && scope.minBalance !== undefined) {
        if(parseFloat(value) < parseFloat(scope.minBalance)) {
          scope.balanceTooLow = true;
          scope.invalid = true;
        }
      }
    });

    scope.$watch('minBalance', function(value) {
      scope.invalid = false;
      scope.balanceTooLow = false;
      if(scope.selected && value !== undefined) {
        if(parseFloat(scope.selected.balance) < parseFloat(value)) {
          scope.balanceTooLow = true;
          scope.invalid = true;
        }
      }
    });

    scope.$watch('identity', function(value) {
      if(value) {
        scope.identityId = value;
        updateAccounts(scope);
      }
    });
  }

  return {
    scope: {
      selected: '=',
      invalid: '=',
      fixed: '@',
      minBalance: '@',
      showDepositButton: '@',
      identity: '@',
      instant: '='
    },
    controller: Ctrl,
    templateUrl: '/partials/account-selector.html',
    link: Link
  };
})
.directive('budgetSelector', function() {
  function Ctrl($scope, svcBudget, svcAccount) {
    $scope.services = {
      account: svcAccount.state,
      budget: svcBudget.state
    };
    $scope.budgets = svcBudget.budgets;
    $scope.account = null;
    $scope.accounts = svcAccount.accounts;
    $scope.$watch('budgets', function(budgets) {
      if(!$scope.selected || $.inArray($scope.selected, budgets) === -1) {
        $scope.selected = budgets[0] || null;
      }
    }, true);
    svcBudget.get();
  }

  function Link(scope, element, attrs) {
    scope.$watch('selected', function(value) {
      // set associated account
      scope.account = null;
      for(var i = 0; i < scope.accounts.length; ++i) {
        var account = scope.accounts[i];
        if(value.source === account.id) {
          scope.account = account;
          break;
        }
      }
    });

    scope.$watch('selected.account', function(value) {
      scope.invalid = false;
      scope.balanceTooLow = false;
      if(value && scope.minBalance !== undefined) {
        if(parseFloat(value.balance) < parseFloat(scope.minBalance)) {
          scope.invalid = true;
          scope.balanceTooLow = true;
        }
      }
    });

    scope.$watch('selected.psaMaxPerUse', function(value) {
      scope.invalid = false;
      scope.maxPerUseTooLow = false;
      if(value && scope.minBalance !== undefined) {
        if(parseFloat(value) < parseFloat(scope.minBalance)) {
          scope.invalid = true;
          scope.maxPerUseTooLow = true;
        }
      }
    });

    scope.$watch('selected.balance', function(value) {
      // validation
      scope.invalid = false;
      scope.balanceTooLow = false;
      if(value && scope.minBalance !== undefined) {
        if(parseFloat(value) < parseFloat(scope.minBalance)) {
          scope.invalid = true;
          scope.balanceTooLow = true;
        }
      }
    });

    scope.$watch('minBalance', function(value) {
      // validation
      scope.invalid = false;
      scope.balanceTooLow = false;
      scope.maxPerUseTooLow = false;
      if(scope.selected && value !== undefined) {
        var minBalance = parseFloat(value);
        if(parseFloat(scope.selected.balance) < minBalance) {
          scope.invalid = true;
          scope.balanceTooLow = true;
        }
        // check max per use
        else if(scope.selected.psaMaxPerUse < minBalance) {
          scope.invalid = true;
          scope.maxPerUseTooLow = true;
        }
        // check associated account balance is too low
        else if(scope.account &&
          parseFloat(scope.account.balance) < minBalance) {
          scope.invalid = true;
          scope.balanceTooLow = true;
        }
      }
    });
  }

  return {
    scope: {
      selected: '=',
      invalid: '=',
      minBalance: '@'
    },
    controller: Ctrl,
    templateUrl: '/partials/budget-selector.html',
    link: Link
  };
})
.directive('identitySelector', function() {
  return {
    scope: {
      identityTypes: '=',
      identities: '=',
      selected: '=',
      invalid: '='
    },
    templateUrl: '/partials/identity-selector.html'
  };
})
.directive('paymentTokenSelector', function(svcPaymentToken) {
  function Ctrl($scope) {
    $scope.services = {
      token: svcPaymentToken.state
    };
    $scope.paymentTokens = svcPaymentToken.paymentTokens;
    $scope.$watch('paymentTokens', function(tokens) {
      if(!$scope.selected || $.inArray($scope.selected, tokens) === -1) {
        $scope.selected = tokens[0] || null;
      }
    }, true);
    svcPaymentToken.get();
  }

  function Link(scope, element, attrs) {
    attrs.$observe('fixed', function(value) {
      scope.fixed = value;
    });
    scope.$watch('instant', function(value) {
      if(value === 'non') {
        scope.paymentTokens = svcPaymentToken.nonInstant;
        scope.paymentMethods = svcPaymentToken.nonInstantPaymentMethods;
      }
      else if(value) {
        scope.paymentTokens = svcPaymentToken.instant;
        scope.paymentMethods = svcPaymentToken.instantPaymentMethods;
      }
      else {
        scope.paymentTokens = svcPaymentToken.paymentTokens;
        scope.paymentMethods = svcPaymentToken.paymentMethods;
      }
    });
  }

  return {
    scope: {
      selected: '=',
      invalid: '=',
      fixed: '@',
      instant: '='
    },
    controller: Ctrl,
    templateUrl: '/partials/payment-token-selector.html',
    link: Link
  };
})
.directive('modalAlert', function(svcModal) {
  return svcModal.directive({
    name: 'Alert',
    transclude: true,
    templateUrl: '/partials/modals/alert.html',
    scope: {
      header: '@modalHeader',
      ok: '@modalOk',
      cancel: '@modalCancel'
    }
  });
})
.directive('modalAddAccount', function(svcModal, svcIdentity, svcAccount) {
  function Ctrl($scope) {
    $scope.open = function() {
      $scope.data = window.data || {};
      $scope.feedback = {};
      $scope.loading = false;
      $scope.identityId = svcIdentity.identity.id || {};
      $scope.account = {
        '@context': 'http://purl.org/payswarm/v1',
        currency: 'USD',
        psaPublic: []
      };
      $scope.accountVisibility = 'hidden';
    };

    $scope.addAccount = function() {
      $scope.account.psaPublic = [];
      if($scope.accountVisibility === 'public') {
        $scope.account.psaPublic.push('label');
        $scope.account.psaPublic.push('owner');
      }

      $scope.loading = true;
      svcAccount.add(
        $scope.account, $scope.identityId, function(err, account) {
        $scope.loading = false;
        if(!err) {
          $scope.close(null, account);
        }
        $scope.feedback.error = err;
      });
    };
  }

  function Link(scope, element, attrs) {
    scope.feedbackTarget = element;
    attrs.$observe('identity', function(value) {
      value = scope.$eval(value);
      if(value) {
        scope.identityId = value;
      }
    });
  }

  return svcModal.directive({
    name: 'AddAccount',
    scope: {
      showAlert: '@modalAddAccountAlert',
      identityId: '@'
    },
    templateUrl: '/partials/modals/add-account.html',
    controller: Ctrl,
    link: Link
  });
})
.directive('modalEditAccount', function(svcModal, svcAccount) {
  function Ctrl($scope) {
    $scope.open = function() {
      $scope.data = window.data || {};
      $scope.feedback = {};
      $scope.loading = false;
      $scope.identity = data.identity || {};

      // copy account for editing
      $scope.account = {};
      angular.extend($scope.account, $scope.sourceAccount);

      $scope.accountVisibility = ($scope.account.psaPublic.length === 0) ?
        'hidden' : 'public';
      $scope.editing = true;
    };

    $scope.editAccount = function() {
      var account = {
        '@context': 'http://purl.org/payswarm/v1',
        id: $scope.account.id,
        label: $scope.account.label,
        psaPublic: []
      };
      if($scope.accountVisibility === 'public') {
        account.psaPublic.push('label');
        account.psaPublic.push('owner');
      }

      $scope.loading = true;
      svcAccount.update(account, function(err, account) {
        $scope.loading = false;
        if(!err) {
          $scope.close(null, account);
        }
        $scope.feedback.error = err;
      });
    };
  }

  return svcModal.directive({
    name: 'EditAccount',
    scope: {sourceAccount: '=account'},
    templateUrl: '/partials/modals/edit-account.html',
    controller: Ctrl,
    link: function(scope, element, attrs) {
      scope.feedbackTarget = element;
    }
  });
})
.directive('modalAddBudget', function(svcModal) {
  function Ctrl($scope, svcBudget) {
    $scope.selection = {
      account: null
    };

    $scope.open = function() {
      $scope.data = window.data || {};
      $scope.feedback = {};
      $scope.loading = false;
      $scope.identity = data.identity || {};
      $scope.budget = {
        '@context': 'http://purl.org/payswarm/v1',
        psaRefresh: 'psa:Never',
        psaExpires: 7889400 /* 3 months */
      };
      $scope.refreshChoices = [
        {id: 'psa:Never', label: 'Never'},
        {id: 'psa:Hourly', label: 'Hourly'},
        {id: 'psa:Daily', label: 'Daily'},
        {id: 'psa:Weekly', label: 'Weekly'},
        {id: 'psa:Monthly', label: 'Monthly'},
        {id: 'psa:Yearly', label: 'Yearly'}
      ];
      $scope.expireChoices = [
        {label: '1 month', value: 2629800},
        {label: '3 months', value: 7889400},
        {label: '6 months', value: 15778800},
        {label: '1 year', value: 31557600}
      ];
    };

    $scope.addBudget = function() {
      $scope.budget.source = $scope.selection.account.id;
      $scope.loading = true;
      svcBudget.add($scope.budget, function(err, budget) {
        $scope.loading = false;
        if(!err) {
          $scope.close(null, budget);
        }
        $scope.feedback.error = err;
      });
    };
  }

  return svcModal.directive({
    name: 'AddBudget',
    templateUrl: '/partials/modals/add-budget.html',
    controller: Ctrl,
    link: function(scope, element, attrs) {
      scope.feedbackTarget = element;
    }
  });
})
.directive('modalEditBudget', function(svcModal) {
  function Ctrl($scope, svcBudget) {
    $scope.selection = {
      account: null
    };

    $scope.open = function() {
      $scope.data = window.data || {};
      $scope.feedback = {};
      $scope.loading = false;
      $scope.identity = data.identity || {};
      $scope.refreshChoices = [
        {id: 'psa:Never', label: 'Never'},
        {id: 'psa:Hourly', label: 'Hourly'},
        {id: 'psa:Daily', label: 'Daily'},
        {id: 'psa:Weekly', label: 'Weekly'},
        {id: 'psa:Monthly', label: 'Monthly'},
        {id: 'psa:Yearly', label: 'Yearly'}
      ];
      $scope.expireChoices = [
        {label: 'Current', value: ''},
        {label: '1 month', value: 2629800},
        {label: '3 months', value: 7889400},
        {label: '6 months', value: 15778800},
        {label: '1 year', value: 31557600}
      ];
      // copy source budget for editing
      $scope.budget = {};
      angular.extend($scope.budget, $scope.sourceBudget);
      // default to current value
      $scope.budget.psaExpires = '';
    };

    $scope.editBudget = function() {
      // set all fields from UI
      var b = $scope.budget;
      var budget = {
        '@context': 'http://purl.org/payswarm/v1',
        id: b.id,
        label: b.label,
        source: $scope.selection.account.id,
        amount: b.amount,
        // vendors not updated here
        //vendor: b.vendor,
        psaExpires: b.psaExpires,
        psaMaxPerUse: b.maxPerUse,
        psaRefresh: b.psaRefresh
      };
      // remove fields not being updated
      angular.forEach(budget, function(value, key) {
        if(value === null || value === undefined || value.length === 0) {
          delete budget[key];
        }
      });

      $scope.loading = true;
      svcBudget.update(budget, function(err, budget) {
        $scope.loading = false;
        if(!err) {
          $scope.close(null, budget);
        }
        $scope.feedback.error = err;
      });
    };
  }

  return svcModal.directive({
    name: 'EditBudget',
    scope: {sourceBudget: '=budget'},
    templateUrl: '/partials/modals/edit-budget.html',
    controller: Ctrl,
    link: function(scope, element, attrs) {
      scope.feedbackTarget = element;
    }
  });
})
.directive('modalAddPaymentToken', function(svcModal) {
  function Ctrl($scope, svcPaymentToken, svcConstant) {
    $scope.selection = {
      address: null
    };

    $scope.open = function() {
      $scope.data = window.data || {};
      $scope.monthLabels = svcConstant.monthLabels;
      $scope.years = svcConstant.years;
      $scope.feedback = {};
      $scope.loading = false;
      $scope.identity = data.identity || {};
      $scope.paymentGateway = data.paymentGateway || 'Test';
      $scope.paymentMethods =
        $scope.paymentMethods || ['ccard:CreditCard', 'bank:BankAccount'];
      // default to first payment method
      $scope.paymentMethod = $scope.paymentMethods[0];
      $scope.label = '';
      $scope.card = {
        '@context': 'http://purl.org/payswarm/v1',
        type: 'ccard:CreditCard'
      };
      $scope.bankAccountTypes = [
        {id: 'bank:Checking', label: 'Checking'},
        {id: 'bank:Savings', label: 'Savings'},
      ];
      $scope.bankAccount = {
        '@context': 'http://purl.org/payswarm/v1',
        type: 'bank:BankAccount',
        bankAccountType: 'bank:Checking'
      };

      $scope.multiEnabled = ($scope.paymentMethods.length > 1);
      $scope.creditCardEnabled =
        ($scope.paymentMethods.indexOf('ccard:CreditCard') !== -1);
      $scope.bankAccountEnabled =
        ($scope.paymentMethods.indexOf('bank:BankAccount') !== -1);

      $scope.agreementChecked = false;
      $scope.billingAddressRequired = true;
      // billing address UI depends on payment method
      $scope.$watch('paymentMethod', function() {
        var isCreditCard = ($scope.paymentMethod === 'ccard:CreditCard');
        var isBankAccount = ($scope.paymentMethod === 'bank:BankAccount');
        $scope.billingAddressRequired = isCreditCard || isBankAccount;
        $scope.agreementChecked = false;
      });
    };

    $scope.add = function() {
      function getAddress() {
        var a = $scope.selection.address;
        return {
          type: a.type,
          label: a.label,
          fullName: a.fullName,
          streetAddress: a.streetAddress,
          locality: a.locality,
          region: a.region,
          postalCode: a.postalCode,
          countryName: a.countryName
        };
      };

      // create post data
      var token = {
        '@context': 'http://purl.org/payswarm/v1',
        label: $scope.label,
        paymentGateway: $scope.paymentGateway
      };

      // handle payment method specifics
      if($scope.paymentMethod === 'ccard:CreditCard') {
        var c = $scope.card;

        // copy required fields
        token.source = {
          '@context': c['@context'],
          type: c.type,
          cardBrand: c.cardBrand,
          cardNumber: c.cardNumber,
          cardExpMonth: c.cardExpMonth,
          cardExpYear: c.cardExpYear,
          cardCvm: c.cardCvm,
          address: getAddress()
        };
      }
      else if($scope.paymentMethod === 'bank:BankAccount') {
        var b = $scope.bankAccount;

        // copy required fields
        token.source = {
          '@context': b['@context'],
          type: b.type,
          bankAccount: b.bankAccount,
          bankAccountType: b.bankAccountType,
          bankRoutingNumber: b.bankRoutingNumber,
          address: getAddress()
        };
      }

      // add payment token
      $scope.loading = true;
      svcPaymentToken.add(token, function(err, addedToken) {
        $scope.loading = false;
        if(!err) {
          $scope.close(null, addedToken);
        }
        $scope.feedback.error = err;
      });
    };
  }

  return svcModal.directive({
    name: 'AddPaymentToken',
    scope: {
      paymentMethods: '='
    },
    templateUrl: '/partials/modals/add-payment-token.html',
    controller: Ctrl,
    link: function(scope, element, attrs) {
      scope.feedbackTarget = element;
    }
  });
})
.directive('modalVerifyBankAccount', function(svcModal) {
  function Ctrl($scope, svcPaymentToken, svcAccount) {
    $scope.selection = {
      destination: null
    };

    $scope.open = function() {
      $scope.feedback = {};
      $scope.loading = false;
      $scope.transfer = null;
      $scope.psaVerifyParameters = {
        amount: [
          null,
          null
        ]
      };
      var source = $scope.input ? $scope.input.source : null;
      $scope.input = {
        // payment token source
        source: source,
        amount: ''
      };

      // state in ('preparing', 'reviewing', 'complete')
      $scope.state = 'preparing';
    };

    $scope.prepare = function() {
      $scope.state = 'preparing';
    };

    $scope.review = function() {
      var verifyRequest = {
        '@context': 'http://purl.org/payswarm/v1',
        psaVerifyParameters: {
          amount: [
            $scope.psaVerifyParameters.amount[0],
            $scope.psaVerifyParameters.amount[1]
          ]
        }
      };
      if($scope.selection.destination && $scope.input.amount &&
        parseFloat($scope.input.amount) !== 0) {
        verifyRequest.destination = $scope.selection.destination.id;
        verifyRequest.amount = $scope.input.amount;
      }
      $scope.loading = true;
      svcPaymentToken.verify(
        $scope.token.id, verifyRequest, function(err, deposit) {
        if(!err) {
          // copy to avoid angular keys in POSTed data
          $scope._deposit = angular.copy(deposit);
          $scope.deposit = deposit;
        }
        // Synthesize validation error for UI
        // FIXME: improve error display
        else if(err.type === 'payswarm.website.VerifyPaymentTokenFailed' &&
          err.cause &&
          err.cause.type === 'payswarm.financial.VerificationFailed') {
          err = {
            "message": "",
            "type": "payswarm.validation.ValidationError",
            "details": {
              "errors": [
                {
                  "name": "payswarm.validation.ValidationError",
                  "message": "verification amount is incorrect",
                  "details": {
                    "path": "psaVerifyParameters.amount[0]",
                    "public": true
                  },
                  "cause": null
                },
                {
                  "name": "payswarm.validation.ValidationError",
                  "message": "verification amount is incorrect",
                  "details": {
                    "path": "psaVerifyParameters.amount[1]",
                    "public": true
                  },
                  "cause": null
                }
              ]
            },
            "cause": null
          };
        }
        // Signal to contact support if needed.
        else if(err.type === 'payswarm.website.VerifyPaymentTokenFailed' &&
          err.cause &&
          err.cause.type === 'payswarm.financial.MaxVerifyAttemptsExceeded') {
          $scope.feedback.contactSupport = true;
        }
        $scope.feedback.error = err;
        if(err) {
          $scope.loading = false;
          return;
        }

        // FIXME: duplicated from deposit code
        // get public account information for all payees
        $scope.accounts = {};
        angular.forEach(deposit.transfer, function(xfer) {
          $scope.accounts[xfer.destination] = {};
          if($scope.selection.destination &&
            $scope.selection.destination.id === xfer.destination) {
            $scope.transfer = xfer;
          }
        });
        async.forEach(Object.keys($scope.accounts),
          function(account, callback) {
          payswarm.accounts.getOne({
            account: account,
            success: function(response) {
              $scope.accounts[account].label = response.label;
              callback();
            },
            error: function(err) {
              $scope.accounts[account].label = 'Private Account';
              callback();
            }
          });
        }, function(err) {
          $scope.loading = false;
          // FIXME: handle err
          $scope.feedback = {};
          //
          // go to top of page
          // FIXME: use directive to do this
          //var target = options.target;
          //$(target).animate({scrollTop: 0}, 0);

          $scope.state = 'reviewing';
          $scope.$apply();
        });
      });
    };

    $scope.confirm = function() {
      $scope.loading = true;
      svcPaymentToken.verify(
        $scope.token.id, $scope._deposit, function(err, deposit) {
        $scope.loading = false;
        if(!err) {
          // show complete page
          $scope.deposit = deposit;
          $scope.state = 'complete';

          // get updated token
          svcPaymentToken.getOne($scope.token.id);

          // get updated balance after a delay
          if($scope.selection.destination) {
            svcAccount.getOne($scope.selection.destination.id, {delay: 500});
          }

          // go to top of page
          //var target = options.target;
          //$(target).animate({scrollTop: 0}, 0);
        }
        $scope.feedback.error = err;
      });
    };

    //$scope.done = function() {
    //  $scope.close(null, $scope.deposit);
    //}
  }

  return svcModal.directive({
    name: 'VerifyBankAccount',
    scope: {
      token: '='
    },
    templateUrl: '/partials/modals/verify-bank-account.html',
    controller: Ctrl,
    link: function(scope, element, attrs) {
      scope.feedbackTarget = element;
    }
  });
})
.directive('modalAddIdentity', function(svcModal, svcIdentity, svcAccount) {
  function Ctrl($scope) {
    $scope.baseUrl = window.location.protocol + '//' + window.location.host;
    $scope.open = function() {
      $scope.feedback = {};
      $scope.loading = false;
      // identity
      $scope.identityType = $scope.identityTypes[0];
      $scope.identityLabel = '';
      $scope.identitySlug = '';
      $scope.identity = {};
      $scope.identityTypeLabels = {
        'ps:PersonalIdentity': 'Personal',
        'ps:VendorIdentity': 'Vendor'
      };
      angular.forEach($scope.identityTypes, function(type) {
        $scope.identity[type] = {
          '@context': 'http://purl.org/payswarm/v1',
          type: type
        };
      });

      // account
      $scope.account = {
        '@context': 'http://purl.org/payswarm/v1',
        label: 'Primary Account',
        psaSlug: 'primary',
        currency: 'USD',
        psaPublic: []
      };
      $scope.accountVisibility = 'hidden';
    };

    $scope.addIdentity = function() {
      var identity = $scope.identity[$scope.identityType];
      identity.label = $scope.identityLabel;
      identity.psaSlug = $scope.identitySlug;
      $scope.loading = true;
      svcIdentity.add(identity, function(err, identity) {
        if(!err) {
          return addAccount(identity);
        }

        // if identity is a duplicate, add account to it
        if(err.type === 'payswarm.website.DuplicateIdentity') {
          identity.id = $scope.baseUrl + '/i/' + identity.psaSlug;
          return addAccount(identity);
        }

        $scope.loading = false;
        $scope.feedback.error = err;
      });
    };

    function addAccount(identity) {
      $scope.account.psaPublic = [];
      if($scope.accountVisibility === 'public') {
        $scope.account.psaPublic.push('label');
        $scope.account.psaPublic.push('owner');
      }

      // add account
      svcAccount.add($scope.account, identity.id, function(err, account) {
        $scope.loading = false;
        if(!err) {
          $scope.close(null, {identity: identity, account: account});
        }
        // FIXME: identity vs account feedback
        $scope.feedback.error = err;
      });
    }
  }

  return svcModal.directive({
    name: 'AddIdentity',
    scope: {
      identityTypes: '='
    },
    templateUrl: '/partials/modals/add-identity.html',
    controller: Ctrl,
    link: function(scope, element, attrs) {
      scope.feedbackTarget = element;
    }
  });
})
.directive('modalSwitchIdentity', function(svcModal, svcIdentity) {
  function Ctrl($scope) {
    function init() {
      $scope.identityTypes = ['ps:PersonalIdentity', 'ps:VendorIdentity'];
      $scope.identities = svcIdentity.identities;
      $scope.selected = svcIdentity.identity;
    };
    init();

    $scope.switchIdentity = function() {
      // if current url starts with '/i', switch to other identity's dashboard
      var identity = $scope.selected;
      var redirect = window.location.href;
      if(window.location.pathname.indexOf('/i') === 0) {
        redirect = identity.id + '/dashboard';
      }

      payswarm.switchIdentity({
        identity: identity.id,
        redirect: redirect
      });
    };
  }

  return svcModal.directive({
    name: 'SwitchIdentity',
    templateUrl: '/partials/modals/switch-identity.html',
    controller: Ctrl
  });
})
.directive('modalAddAddress', function(
  svcModal, svcIdentity, svcAddress, svcConstant) {
  function Ctrl($scope) {
    $scope.open = function() {
      $scope.data = window.data || {};
      $scope.countries = svcConstant.countries || {};
      $scope.feedback = {};
      $scope.loading = false;
      $scope.identity = svcIdentity.identity || {};
      $scope.originalAddress = {
        '@context': 'http://purl.org/payswarm/v1',
        type: 'vcard:Address',
        // default to US
        countryName: 'US'
      };
      $scope.selection = {
        address: null
      };
      $scope.validatedAddress = null;

      // state in ('editing', 'selecting')
      $scope.state = 'editing';
    };

    $scope.validate = function() {
      $scope.loading = true;
      svcAddress.validate($scope.originalAddress, function(err, validated) {
        $scope.loading = false;
        $scope.feedback.error = err;
        if(err) {
          // FIXME
          console.log('validation failed', err);
          return;
        }
        // FIXME: should backend handle this?
        // copy over non-validation fields
        $scope.validatedAddress = angular.extend(validated, {
          '@context': 'http://purl.org/payswarm/v1',
          type: 'vcard:Address',
          label: $scope.originalAddress.label,
          fullName: $scope.originalAddress.fullName
        });
        $scope.state = 'selecting';
      });
    };

    $scope.add = function(clickedAddress) {
      var addressToAdd = clickedAddress || $scope.selection.address;
      $scope.loading = false;
      svcAddress.add(addressToAdd, function(err, addedAddress) {
        $scope.loading = true;
        $scope.feedback.error = err;
        if(err) {
          // FIXME
          console.log('adding failed', err);
          return;
        }
        $scope.close(null, addedAddress);
      });
    };

    $scope.edit = function() {
      $scope.feedback = {};
      $scope.state = 'editing';
      $scope.selection.address = null;
    };
  }

  function Link(scope, element, attrs) {
    scope.feedbackTarget = element;
  }

  return svcModal.directive({
    name: 'AddAddress',
    scope: {
      showAlert: '@modalAddAddressAlert'
    },
    templateUrl: '/partials/modals/add-address.html',
    controller: Ctrl,
    link: Link
  });
})
.directive('vcardAddress', function() {
  return {
    scope: {
      address: '=vcardAddress',
      noLabel: '='
    },
    templateUrl: '/partials/vcard-address.html'
  };
})
.directive('feedback', function() {
  /*
   * Show stack of feedback items ordered as:
   *   errors, alerts, successes, infos
   * scope.feedback is the source of feedback info. It is an object with
   * 'error', 'alert', 'success', and 'info' properties, each can be a single
   * object or an array of objects.
   * Each feedback object should at least have a 'message' property and errors
   * should have a 'type' property.
   * scope.target is used to highlight errors by adding 'error' class to
   * elements with a data-binding property that matches an error details path
   * such as those from validation errors.
   */
  function processFeedbackType(scope, feedbackElement, type) {
    var items = (scope.feedback && scope.feedback[type]) || [];
    if(!angular.isArray(items)) {
      items = [items];
    }
    for(var i = 0; i < items.length; ++i) {
      var item = items[i];
      var alert = $('<div class="alert"/>');
      if(type !== 'alert') {
        alert.addClass('alert-' + type);
      }

      // handle form feedback
      switch(item.type) {
      // generic form errors
      case 'payswarm.validation.ValidationError':
        alert.text('Please correct the information you entered.');
        $.each(item.details.errors, function(i, detailError) {
          var binding = detailError.details.path;
          if(binding) {
            // highlight element using data-binding
            $('[data-binding="' + binding + '"]', scope.target)
              .addClass('error');
          }
        });
        break;
      default:
        var message = item.message;
        // FIXME: this should be limited as needed
        if(item.cause && item.cause.message) {
          message = message + ' ' + item.cause.message;
        }
        if(scope.feedback.contactSupport) {
          message = message +
            ' Please <a target="_blank" href="/contact">contact</a> us for ' +
            'assistance.';
        }
        alert.html(message);
      }

      feedbackElement.append(alert);
    }
  }

  function processFeedback(scope, feedbackElement) {
    // clear previous feedback
    $('[data-binding]', scope.target).removeClass('error');
    feedbackElement.empty();

    processFeedbackType(scope, feedbackElement, 'error', true);
    processFeedbackType(scope, feedbackElement, 'alert', false);
    processFeedbackType(scope, feedbackElement, 'success', false);
    processFeedbackType(scope, feedbackElement, 'info', false);
  }
  return {
    scope: {
      feedback: '=',
      target: '='
    },
    link: function(scope, element, attrs) {
      scope.$watch('feedback', function(value) {
        processFeedback(scope, element);
      }, true);
    }
  };
})
.directive('modalDeposit', function(svcModal) {
  function Ctrl($scope, svcPaymentToken, svcAccount, svcTransaction) {
    $scope.open = function() {
      $scope.data = window.data || {};
      $scope.feedback = {};
      $scope.loading = false;

      var source = $scope.input ? $scope.input.source : null;
      $scope.input = {
        // payment token source
        source: source,
        amount: ''
      };

      // state in ('preparing', 'reviewing', 'complete')
      $scope.state = 'preparing';
    };

    $scope.prepare = function() {
      $scope.state = 'preparing';
      $scope.feedback = {};
    };

    $scope.review = function() {
      // clean deposit
      var deposit = {
        '@context': 'http://purl.org/payswarm/v1',
        type: ['com:Transaction', 'com:Deposit'],
        payee: [{
          type: 'com:Payee',
          payeeGroup: ['deposit'],
          payeeRate: $scope.input.amount,
          payeeRateType: 'com:FlatAmount',
          payeeApplyType: 'com:Exclusive',
          destination: $scope.account.id
        }],
        source: $scope.input.source.id
      };
      $scope.loading = true;
      payswarm.deposit.sign({
        deposit: deposit,
        success: function(deposit) {
          // get public account information for all payees
          $scope.accounts = {};
          for(var i in deposit.transfer) {
            $scope.accounts[deposit.transfer[i].destination] = {};
          }
          async.forEach(Object.keys($scope.accounts),
            function(account, callback) {
            payswarm.accounts.getOne({
              account: account,
              success: function(response) {
                $scope.accounts[account].label = response.label;
                callback();
              },
              error: function(err) {
                $scope.accounts[account].label = 'Private Account';
                callback();
              }
            });
          }, function(err) {
            // FIXME: handle err
            $scope.feedback = {};
            //
            // go to top of page
            // FIXME: use directive to do this
            //var target = options.target;
            //$(target).animate({scrollTop: 0}, 0);

            $scope.loading = false;

            // copy to avoid angular keys in POSTed data
            $scope._deposit = angular.copy(deposit);
            $scope.deposit = deposit;
            $scope.state = 'reviewing';
            $scope.$apply();
          });
        },
        error: function(err) {
          $scope.loading = false;
          $scope.feedback.error = err;
          $scope.$apply();
        }
      });
    };

    $scope.confirm = function() {
      $scope.loading = true;
      payswarm.deposit.confirm({
        deposit: $scope._deposit,
        success: function(deposit) {
          $scope.loading = false;

          // show complete page
          $scope.deposit = deposit;
          $scope.state = 'complete';
          $scope.$apply();

          // get updated balance after a delay
          svcAccount.getOne($scope.account.id, {delay: 500});

          // update recent transactions
          svcTransaction.getRecent({force: true});

          // go to top of page
          //var target = options.target;
          //$(target).animate({scrollTop: 0}, 0);
        },
        error: function(err) {
          $scope.loading = false;
          $scope.feedback.error = err;
          $scope.$apply();
        }
      });
    };

    //$scope.done = function() {
    //  $scope.close(null, $scope.deposit);
    //}
  }

  return svcModal.directive({
    name: 'Deposit',
    scope: {
      account: '=',
      instant: '='
    },
    templateUrl: '/partials/modals/deposit.html',
    controller: Ctrl,
    link: function(scope, element, attrs) {
      scope.feedbackTarget = element;
    }
  });
})
.directive('modalWithdraw', function(svcModal) {
  function Ctrl($scope, svcPaymentToken, svcAccount, svcTransaction) {
    $scope.open = function() {
      $scope.data = window.data || {};
      $scope.feedback = {};
      $scope.loading = false;

      var destination = $scope.input ? $scope.input.destination : null;
      $scope.input = {
        // payment token destination
        destination: destination,
        mode: 'custom',
        amount: ''
      };
      $scope.checkAmount = function() {
        var amountString = $scope.input.amount;
        var amount = parseFloat(amountString);
        var balance = parseFloat($scope.account.balance);
        return amountString === '' ||
          (!isNaN(amount) &&
            (amount > 0) &&
            (amount <= balance));
      };

      // state in ('preparing', 'reviewing', 'complete')
      $scope.state = 'preparing';
    };

    $scope.prepare = function() {
      $scope.state = 'preparing';
      $scope.feedback = {};
    };

    $scope.review = function() {
      // clean withdrawal
      var withdrawal = {
        '@context': 'http://purl.org/payswarm/v1',
        type: ['com:Transaction', 'com:Withdrawal'],
        source: $scope.account.id,
        payee: [{
          type: 'com:Payee',
          payeeGroup: ['withdrawal'],
          payeeRate: $scope.input.amount,
          payeeRateType: 'com:FlatAmount',
          payeeApplyType: 'com:Exclusive',
          destination: 'urn:payswarm-external-account',
          comment: 'Withdrawal'
        }],
        destination: $scope.input.destination.id
      };
      $scope.loading = true;
      payswarm.withdrawal.sign({
        withdrawal: withdrawal,
        success: function(withdrawal) {
          // get public account information for all payees
          $scope.accounts = {};
          angular.forEach(withdrawal.transfer, function(xfer) {
            $scope.accounts[xfer.destination] = {};
          });
          async.forEach(Object.keys($scope.accounts),
            function(account, callback) {
            if(account.indexOf('urn') === 0) {
              $scope.accounts[account].label = $scope.input.destination.label;
              return callback();
            }
            payswarm.accounts.getOne({
              account: account,
              success: function(response) {
                $scope.accounts[account].label = response.label;
                callback();
              },
              error: function(err) {
                $scope.accounts[account].label = 'Private Account';
                callback();
              }
            });
          }, function(err) {
            // FIXME: handle err
            $scope.feedback = {};
            //
            // go to top of page
            // FIXME: use directive to do this
            //var target = options.target;
            //$(target).animate({scrollTop: 0}, 0);

            $scope.loading = false;

            // copy to avoid angular keys in POSTed data
            $scope._withdrawal = angular.copy(withdrawal);
            $scope.withdrawal = withdrawal;
            $scope.state = 'reviewing';
            $scope.$apply();
          });
        },
        error: function(err) {
          $scope.loading = false;
          $scope.feedback.error = err;
          $scope.$apply();
        }
      });
    };

    $scope.confirm = function() {
      $scope.loading = true;
      payswarm.withdrawal.confirm({
        withdrawal: $scope._withdrawal,
        success: function(withdrawal) {
          $scope.loading = false;

          // show complete page
          $scope.withdrawal = withdrawal;
          $scope.state = 'complete';
          $scope.$apply();

          // get updated balance after a delay
          svcAccount.getOne($scope.account.id, {delay: 500});

          // update recent transactions
          svcTransaction.getRecent({force: true});

          // go to top of page
          //var target = options.target;
          //$(target).animate({scrollTop: 0}, 0);
        },
        error: function(err) {
          $scope.loading = false;
          $scope.feedback.error = err;
          $scope.$apply();
        }
      });
    };

    //$scope.done = function() {
    //  $scope.close(null, $scope.withdrawal);
    //}
  }

  return svcModal.directive({
    name: 'Withdraw',
    scope: {
      account: '='
    },
    templateUrl: '/partials/modals/withdraw.html',
    controller: Ctrl,
    link: function(scope, element, attrs) {
      scope.feedbackTarget = element;
    }
  });
});

})(jQuery);
