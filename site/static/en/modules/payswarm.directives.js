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
        var pos = tip.getPosition();
        var actualHeight = tip.tip()[0].offsetHeight;
        tip.top = pos.top + pos.height / 2 - actualHeight / 2;
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
      visible: '=popoverVisible'
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
  function Ctrl($scope) {
    $scope.selected = $scope.items[0] || null;

    // called when an item is selected in the selector modal
    $scope.select = function(selected) {
      $scope.selected = selected;
      $scope.showSelectorModal = false;
    };
  }

  return {
    transclude: true,
    scope: {
      items: '=',
      itemType: '@',
      selected: '=',
      addItem: '&'
    },
    controller: Ctrl,
    templateUrl: '/partials/selector.html'
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
.directive('addressSelector', function(svcAddress) {
  function Ctrl($scope, svcAddress) {
    $scope.addresses = svcAddress.addresses;
    $scope.selected = null;
    svcAddress.get(function(err, addresses) {
      if(!err) {
        $scope.selected = addresses[0] || null;
        $scope.$apply();
      }
    });
  }

  return {
    scope: {selected: '='},
    controller: Ctrl,
    templateUrl: '/partials/address-selector.html'
  };
})
.directive('accountSelector', function(svcAccount) {
  function Ctrl($scope, svcAccount) {
    $scope.identityId = window.data.session.identity.id;
    updateAccounts($scope);
  }

  function updateAccounts($scope) {
    var identityId = $scope.identityId;
    $scope.accounts = svcAccount.identities[identityId].accounts;
    $scope.selected = null;
    svcAccount.get({identity: identityId}, function(err, accounts) {
      if(!err) {
        $scope.selected = accounts[0] || null;
        $scope.$apply();
      }
    });
  }

  function Link(scope, element, attrs) {
    scope.$watch('selected', function(value) {
      scope.balanceTooLow = false;
      scope.minBalance = scope.$eval(attrs.minBalance);
      if(value && attrs.minBalance !== undefined) {
        scope.minBalance = parseFloat(scope.minBalance);
        if(value.balance < scope.minBalance) {
          scope.balanceTooLow = true;
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
      minBalance: '@',
      showDepositButton: '@',
      identityId: '@'
    },
    controller: Ctrl,
    templateUrl: '/partials/account-selector.html',
    link: Link
  };
})
.directive('budgetSelector', function(svcBudget, svcAccount) {
  function Ctrl($scope, svcBudget) {
    $scope.budgets = svcBudget.budgets;
    $scope.selected = null;
    $scope.account = null;
    $scope.accounts = svcAccount.accounts;
    svcBudget.get(function(err, budgets) {
      if(!err) {
        $scope.selected = budgets[0] || null;
        $scope.$apply();
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

      // validation
      scope.balanceTooLow = false;
      scope.maxPerUseTooLow = false;
      scope.minBalance = scope.$eval(attrs.minBalance);
      if(value && attrs.minBalance !== undefined) {
        scope.minBalance = parseFloat(scope.minBalance);
        if(value.balance < scope.minBalance) {
          scope.balanceTooLow = true;
        }
        // check max per use
        else if(value.psaMaxPerUse < scope.minBalance) {
          scope.maxPerUseTooLow = true;
        }
        // check associated account balance is too low
        else if(scope.account && scope.account.balance < scope.minBalance) {
          scope.balanceTooLow = true;
        }
      }
    });
  }

  return {
    scope: {selected: '='},
    controller: Ctrl,
    templateUrl: '/partials/budget-selector.html'
  };
})
.directive('identitySelector', function() {
  function Ctrl($scope) {
    $scope.selected = null;
    $scope.selected = $scope.identities[0] || null;
  }

  return {
    scope: {
      identityTypes: '=',
      identities: '=',
      selected: '='
    },
    controller: Ctrl,
    templateUrl: '/partials/identity-selector.html'
  };
})
.directive('modalAddAccount', function(svcModal, svcAccount) {
  function Ctrl($scope) {
    $scope.open = function() {
      $scope.data = window.data || {};
      $scope.identity = data.identity || {};
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

      svcAccount.add($scope.account, $scope.identity, function(err, account) {
        if(!err) {
          $scope.close(null, account);
        }
        console.log('addAccount error', err);
        // FIXME: change to a directive
        var feedback = $('[name="feedback"]', target);
        website.util.processValidationErrors(feedback, target, err);
      });
    };
  }

  function Link(scope, element, attrs) {
    attrs.$observe('identity', function(value) {
      value = scope.$eval(value);
      if(value) {
        scope.identity = value;
      }
    });
  }

  return svcModal.directive({
    name: 'AddAccount',
    scope: {showAlert: '@modalAddAccountAlert', identity: '@'},
    templateUrl: '/partials/modals/add-account.html',
    controller: Ctrl,
    link: Link
  });
})
.directive('modalEditAccount', function(svcModal, svcAccount) {
  function Ctrl($scope) {
    $scope.open = function() {
      $scope.data = window.data || {};
      $scope.identity = data.identity || {};
      $scope.accountVisibility = ($scope.account.psaPublic.length === 0) ?
        'hidden' : 'public';
    };

    $scope.editAccount = function() {
      $scope.account.psaPublic = [];
      if($scope.accountVisibility === 'public') {
        $scope.account.psaPublic.push('label');
        $scope.account.psaPublic.push('owner');
      }

      svcAccount.update($scope.account, function(err, account) {
        if(!err) {
          $scope.close(null, account);
        }
        console.log('editAccount error', err);
        // FIXME: change to a directive
        var feedback = $('[name="feedback"]', target);
        website.util.processValidationErrors(feedback, target, err);
      });
    };
  }

  return svcModal.directive({
    name: 'EditAccount',
    scope: {account: '='},
    templateUrl: '/partials/modals/edit-account.html',
    controller: Ctrl,
  });
})
.directive('modalAddBudget', function(svcModal, svcBudget, svcAccount) {
  function Ctrl($scope) {
    $scope.selection = {
      account: null
    };
    $scope.open = function() {
      $scope.data = window.data || {};
      $scope.identity = data.identity || {};
      $scope.budget = {
        '@context': 'http://purl.org/payswarm/v1'
      };
      $scope.expireChoices = {
        '1 month': 2629800,
        '3 months': 7889400,
        '6 months': 15778800,
        '1 year': 31557600
      };
    };

    $scope.addBudget = function() {
      $scope.budget.source = $scope.selection.account.id;
      svcBudget.add($scope.budget, function(err, budget) {
        if(!err) {
          $scope.close(null, budget);
        }
        // FIXME: change to a directive
        var feedback = $('[name="feedback"]', target);
        website.util.processValidationErrors(feedback, target, err);
      });
    };
  }

  return svcModal.directive({
    name: 'AddBudget',
    templateUrl: '/partials/modals/add-budget.html',
    controller: Ctrl,
  });
})
.directive('modalEditBudget', function(svcModal, svcBudget) {
  function Ctrl($scope) {
    $scope.selection = {
      account: null
    };
    $scope.open = function() {
      $scope.data = window.data || {};
      $scope.identity = data.identity || {};
      $scope.expireChoices = {
        'Current': $scope.budget.psaExpires,
        '1 month': 2629800,
        '3 months': 7889400,
        '6 months': 15778800,
        '1 year': 31557600
      };
    };

    $scope.editBudget = function() {
      $scope.budget.source = $scope.selection.account.id;
      svcBudget.update($scope.budget, function(err) {
        if(!err) {
          $scope.close(null, budget);
        }
        // FIXME: change to a directive
        var feedback = $('[name="feedback"]', target);
        website.util.processValidationErrors(feedback, target, err);
      });
    };
  }

  return svcModal.directive({
    name: 'EditBudget',
    scope: {budget: '='},
    templateUrl: '/partials/modals/edit-budget.html',
    controller: Ctrl,
  });
})
.directive('modalAddPaymentToken', function(svcModal) {
  function Ctrl($scope, svcPaymentToken) {
    $scope.open = function() {
      $scope.data = window.data || {};
      $scope.monthLabels = window.tmpl.monthLabels;
      $scope.years = window.tmpl.years;
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
        type: 'ccard:CreditCard',
        cardAddress: $scope.card ? $scope.card.cardAddress : null
      };
      $scope.bankAccount = {
        '@context': 'http://purl.org/payswarm/v1',
        type: 'bank:BankAccount'
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
          ($scope.paymentMethod === 'ccard:CreditCard');
      });
    };

    $scope.add = function() {
      // create post data
      var token = {
        '@context': 'http://purl.org/payswarm/v1',
        label: $scope.label,
        paymentGateway: $scope.paymentGateway
      };

      // handle payment method specifics
      if($scope.paymentMethod === 'ccard:CreditCard') {
        var c = $scope.card;
        var ca = c.cardAddress;

        // copy required fields
        token.source = {
          '@context': c['@context'],
          type: c.type,
          cardBrand: c.cardBrand,
          cardNumber: c.cardNumber,
          cardExpMonth: c.cardExpMonth,
          cardExpYear: c.cardExpYear,
          cardCvm: c.cardCvm,
          cardAddress: {
            type: ca.type,
            label: ca.label,
            fullName: ca.fullName,
            streetAddress: ca.streetAddress,
            locality: ca.locality,
            region: ca.region,
            postalCode: ca.postalCode,
            countryName: ca.countryName
          }
        }
      }
      else if($scope.paymentMethod === 'bank:BankAccount') {
        var b = $scope.bankAccount;

        // copy required fields
        token.source = {
          '@context': b['@context'],
          type: b.type,
          bankAccount: b.bankAccount,
          bankRoutingNumber: b.bankRoutingNumber
        }
      }

      // add payment token
      svcPaymentToken.add(token, function(err, addedToken) {
        if(err) {
          // FIXME
          console.log('adding failed', token, err);
          $scope.feedback.validationErrors = err;
        }
        else {
          $scope.close(null, addedToken);
        }
        $scope.$apply();
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
.directive('modalAddIdentity', function(svcModal, $filter) {
  function Ctrl($scope) {
    $scope.baseUrl = window.location.protocol + '//' + window.location.host;
    $scope.open = function() {
      // identity
      $scope.identityType = $scope.identityTypes[0];
      $scope.identityLabel = '';
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
        currency: 'USD',
        psaPublic: []
      };
      $scope.accountVisibility = 'hidden';
    };

    $scope.addIdentity = function() {
      // FIXME: add identity service that will add new identities to the
      // session.identities map ... also determine if we want that to be
      // a map or an array of identities
      var identity = $scope.identity[$scope.identityType];
      identity.label = $scope.identityLabel;
      identity.psaSlug = $filter('slug')($scope.identitySlug);
      payswarm.identities.add({
        identity: identity,
        success: function(identity) {
          addAccount(identity);
        },
        error: function(err) {
          // if identity is a duplicate, add account to it
          if(err.type === 'payswarm.website.DuplicateIdentity') {
            identity.id = $scope.baseUrl + '/i/' + identity.psaSlug;
            addAccount(options, identity);
          }
          else {
            // FIXME: change to a directive
            var feedback = $('[name="feedback"]', target);
            website.util.processValidationErrors(feedback, target, err);
          }
        }
      });
    };

    function addAccount(identity) {
      $scope.account.psaSlug = $filter('slug')($scope.account);
      $scope.account.psaPublic = [];
      if($scope.accountVisibility === 'public') {
        $scope.account.psaPublic.push('label');
        $scope.account.psaPublic.push('owner');
      }

      // add account
      payswarm.accounts.add({
        identity: identity.id,
        account: $scope.account,
        success: function(account) {
          $scope.close(null, {identity: identity, account: account});
        },
        error: function(err) {
          // FIXME: change to a directive
          var feedback = $('[name="feedback"]', target);
          website.util.processValidationErrors(
            feedback, $('#add-account-form'), err);
        }
      });
    }
  }

  return svcModal.directive({
    name: 'AddIdentity',
    scope: {
      identityTypes: '='
    },
    templateUrl: '/partials/modals/add-identity.html',
    controller: Ctrl
  });
})
.directive('modalSwitchIdentity', function(svcModal) {
  function Ctrl($scope) {
    function init() {
      $scope.identityTypes = ['ps:PersonalIdentity', 'ps:VendorIdentity'];
      $scope.identities = $.map(
        window.data.session.identities, function(v) {return v;});
      $scope.selected = window.data.identity;
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
.directive('modalAddAddress', function(svcModal, svcAddress) {
  function Ctrl($scope) {
    $scope.open = function() {
      $scope.data = window.data || {};
      $scope.countries = window.tmpl.countries || {};
      $scope.feedback = {};
      $scope.identity = data.identity || {};
      $scope.originalAddress = {
        '@context': 'http://purl.org/payswarm/v1',
        type: 'vcard:Address'
      };
      $scope.validatedAddress = null;
      $scope.selectedAddress = null;

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
      var addressToAdd = clickedAddress || $scope.selectedAddress;
      svcAddress.add(addressToAdd, function(err, addedAddress) {
        if(err) {
          // FIXME
          console.log('adding failed', err);
          return;
        }
        $scope.close(null, addedAddress);
        $scope.$apply();
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

})(jQuery);
