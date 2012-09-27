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
.directive('fadeout', function() {
  return function(scope, element, attrs) {
    scope.$watch(attrs.fadeout, function(value) {
      if(value) {
        element.fadeOut(function() {
          element.remove();
        });
      }
    });
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
.directive('stretchTabs', function() {
  var stretch = function(tabs, tabContent) {
    setTimeout(function() {
      tabs.css('height', tabContent.css('height'));
    });
  };

  return {
    restrict: 'C',
    controller: function($scope, $timeout) {
      $timeout(function() {
        stretch($scope.tabs, $scope.tabContent);
      });
    },
    link: function(scope, element, attrs) {
      scope.tabs = $('.nav-tabs', element);
      scope.tabContent = $('.tab-content', element);
      scope.tabs.click(function() {
        stretch(scope.tabs, scope.tabContent);
      });
    }
  };
})
.directive('creditCardSelector', function() {
  return {
    scope: {
      number: '=creditCardSelector',
      brand: '=creditCardBrand'
    },
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

        // remove old cc-logo classes, add new
        element.removeClass(function(index, css) {
          return (css.match (/\bcc-logo-\S+/g) || []).join(' ');
        }).addClass('cc-logo-' + logo + '-selected');
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
      checking: '@duplicateCheckerChecking'
    },
    link: function(scope, element, attrs) {
      // hide feedback until input changes
      element.addClass('alert').hide();

      var lastInput = null;
      var timer = null;

      scope.$watch('input', function(value) {
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
              var owner = attrs.duplicateCheckerOwner || null;
              $http.post('/identifier', $.extend({
                type: attrs.duplicateCheckerType,
                psaSlug: lastCheck
              }, owner ? {owner: owner} : {}))
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
.directive('selector', function() {
  function Ctrl($scope, $attrs) {
    $scope.$watch('selected', function(value) {
      if(value === undefined) {
        $scope.selected = $scope.items[0] || null;
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
  }

  return {
    transclude: true,
    scope: {
      fixed: '@',
      items: '=',
      itemType: '@',
      selected: '=',
      invalid: '=',
      addItem: '&'
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
    svcAddress.get(function(err, addresses) {
      if(!err && !$scope.selected) {
        $scope.selected = addresses[0] || null;
      }
    });
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
  }

  function updateAccounts($scope) {
    var identityId = $scope.identityId;
    $scope.accounts = svcAccount.identities[identityId].accounts;
    svcAccount.get({identity: identityId}, function(err, accounts) {
      if(!err && !$scope.selected) {
        $scope.selected = accounts[0] || null;
      }
    });
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

    attrs.$observe('identity', function(value) {
      value = scope.$eval(value);
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
      identityId: '@',
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
    svcBudget.get(function(err, budgets) {
      if(!err && !$scope.selected) {
        $scope.selected = budgets[0] || null;
      }
    });
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
    $scope.paymentTokens = svcPaymentToken.verified;
    svcPaymentToken.get(function(err, tokens) {
      if(!err && !$scope.selected) {
        $scope.selected = tokens[0] || null;
      }
    });
  }

  function Link(scope, element, attrs) {
    attrs.$observe('fixed', function(value) {
      scope.fixed = value;
    });
    scope.$watch('instant', function(value) {
      if(value) {
        scope.paymentTokens = svcPaymentToken.instant;
      }
      else {
        scope.paymentTokens = svcPaymentToken.paymentTokens;
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
.directive('modalAddAccount', function(svcModal, svcIdentity, svcAccount) {
  function Ctrl($scope) {
    $scope.open = function() {
      $scope.data = window.data || {};
      $scope.feedback = {};
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

      svcAccount.add(
        $scope.account, $scope.identityId, function(err, account) {
        if(!err) {
          $scope.close(null, account);
        }
        $scope.feedback.validationErrors = err;
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
    scope: {showAlert: '@modalAddAccountAlert', identityId: '@'},
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

      svcAccount.update(account, function(err, account) {
        if(!err) {
          $scope.close(null, account);
        }
        $scope.feedback.validationErrors = err;
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
      svcBudget.add($scope.budget, function(err, budget) {
        if(!err) {
          $scope.close(null, budget);
        }
        $scope.feedback.validationErrors = err;
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

      svcBudget.update(budget, function(err, budget) {
        if(!err) {
          $scope.close(null, budget);
        }
        $scope.feedback.validationErrors = err;
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

      $scope.billingAddressRequired = true;
      // billing address UI depends on payment method
      $scope.$watch('paymentMethod', function() {
        $scope.billingAddressRequired =
          ($scope.paymentMethod === 'ccard:CreditCard') ||
          ($scope.paymentMethod === 'bank:BankAccount');
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
      svcPaymentToken.add(token, function(err, addedToken) {
        if(!err) {
          $scope.close(null, addedToken);
        }
        $scope.feedback.validationErrors = err;
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
.directive('modalVerifyBankAccount', function(svcModal, svcPaymentToken) {
  function Ctrl($scope) {
    $scope.open = function() {
      $scope.feedback = {};
    };

    $scope.verify = function() {
      return;
      svcPaymentToken.verify(token.id, function(err, token) {
        if(err) {
          // FIXME: handle verification failure error
          $scope.feedback.validationErrors = err;
        }
      });
    };
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
      svcIdentity.add(identity, function(err, identity) {
        if(!err) {
          return addAccount(identity);
        }

        // if identity is a duplicate, add account to it
        if(err.type === 'payswarm.website.DuplicateIdentity') {
          identity.id = $scope.baseUrl + '/i/' + identity.psaSlug;
          addAccount(options, identity);
        }
        else {
          $scope.feedback.validationErrors = err;
        }
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
        if(!err) {
          $scope.close(null, {identity: identity, account: account});
        }
        // FIXME: identity vs account feedback
        $scope.feedback.validationErrors = err;
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
.directive('modalAddAddress', function(svcModal, svcAddress, svcConstant) {
  function Ctrl($scope) {
    $scope.open = function() {
      $scope.data = window.data || {};
      $scope.countries = svcConstant.countries || {};
      $scope.feedback = {};
      $scope.identity = data.identity || {};
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
      svcAddress.validate($scope.originalAddress, function(err, validated) {
        if(err) {
          // FIXME
          console.log('validation failed', err);
          $scope.feedback.validationErrors = err;
        }
        else {
          // FIXME: should backend handle this?
          // copy over non-validation fields
          $scope.validatedAddress = angular.extend(validated, {
            '@context': 'http://purl.org/payswarm/v1',
            type: 'vcard:Address',
            label: $scope.originalAddress.label,
            fullName: $scope.originalAddress.fullName
          });
          $scope.state = 'selecting';
        }
        $scope.$apply();
      });
    };

    $scope.add = function(clickedAddress) {
      var addressToAdd = clickedAddress || $scope.selection.address;
      svcAddress.add(addressToAdd, function(err, addedAddress) {
        if(err) {
          // FIXME
          console.log('adding failed', err);
          return;
        }
        $scope.close(null, addedAddress);
      });
    };

    $scope.edit = function() {
      $scope.state = 'editing';
    };
  }

  return svcModal.directive({
    name: 'AddAddress',
    templateUrl: '/partials/modals/add-address.html',
    controller: Ctrl,
    link: function(scope, element, attrs) {
      scope.feedbackTarget = element;
    }
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
  function processValidationErrors(feedbackTarget, target, ex) {
    // clear previous feedback
    $('[data-binding]', target).removeClass('error');
    feedbackTarget.empty();

    // done if no exception
    if(!ex) {
      // clear alert style
      feedbackTarget.removeClass('alert');
      feedbackTarget.removeClass('alert-error');
      return;
    }

    // add error feedback
    feedbackTarget.addClass('alert');
    feedbackTarget.addClass('alert-error');

    // handle form feedback
    switch(ex.type) {
    // generic form errors
    case 'payswarm.validation.ValidationError':
      feedbackTarget.text('Please correct the information you entered.');
      $.each(ex.details.errors, function(i, error) {
        var binding = error.details.path;
        if(binding) {
          // highlight element using data-binding
          $('[data-binding="' + binding + '"]', target).addClass('error');
        }
      });
      break;
    default:
      feedbackTarget.text(ex.message);
    }
  }
  return {
    scope: {
      feedback: '=',
      target: '='
    },
    link: function(scope, element, attrs) {
      scope.$watch('feedback.validationErrors', function(value) {
        processValidationErrors(element, scope.target, value);
      });
    }
  };
})
.directive('modalDeposit', function(svcModal) {
  function Ctrl($scope, svcPaymentToken, svcAccount) {
    $scope.selection = {
      // payment token source
      source: null,
      amount: ''
    };

    $scope.open = function() {
      $scope.data = window.data || {};
      $scope.feedback = {};

      // state in ('preparing', 'reviewing', 'complete')
      $scope.state = 'preparing';
    };

    $scope.prepare = function() {
      $scope.state = 'preparing';
    };

    $scope.review = function() {
      // clean deposit
      var deposit = {
        '@context': 'http://purl.org/payswarm/v1',
        type: ['com:Transaction', 'com:Deposit'],
        payee: [{
          type: 'com:Payee',
          payeeRate: $scope.selection.amount,
          payeeRateType: 'com:FlatAmount',
          destination: $scope.account.id
        }],
        source: $scope.selection.source.id
      };
      payswarm.deposit.sign({
        deposit: deposit,
        success: function(deposit) {
          // get public account information for all payees
          $scope.accounts = [];
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
            //
            // go to top of page
            // FIXME: use directive to do this
            //var target = options.target;
            //$(target).animate({scrollTop: 0}, 0);

            // copy to avoid angular keys in POSTed data
            $scope.deposit = angular.copy(deposit);
            $scope._deposit = deposit;
            $scope.state = 'reviewing';
            $scope.$apply();
          });
        },
        error: function(err) {
          $scope.feedback.validationErrors = err;
          $scope.$apply();
        }
      });
    };

    $scope.confirm = function() {
      payswarm.deposit.confirm({
        deposit: $scope._deposit,
        success: function(deposit) {
          // show complete page
          $scope.deposit = deposit;
          $scope.state = 'complete';
          $scope.$apply();

          // get updated balance after a delay
          svcAccount.getOne($scope.account.id, {delay: 500});

          // go to top of page
          //var target = options.target;
          //$(target).animate({scrollTop: 0}, 0);
        },
        error: function(err) {
          $scope.feedback.validationErrors = err;
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
});

})(jQuery);
