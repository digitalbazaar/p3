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
  return function(scope, element, attrs) {
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
    if(attrs.spinnerClass) {
      options.className = scope.$eval(attrs.spinnerClass);
    }

    // create spinner
    var spinner = new Spinner(options);
    var spinning = false;

    scope.$watch(attrs.spinner, function(value) {
      if(value) {
        spinner.spin();
        spinning = true;
        element.append(spinner.el);
      }
      else {
        spinner.stop();
        spinning = false;
      }
    });

    scope.$watch(attrs.spinnerClass, function(value) {
      options.className = attrs.spinnerClass;
      spinner.stop();
      spinner = new Spinner(options);
      if(spinning) {
        spinner.spin();
        element.append(spinner.el);
      }
    });

    // stop spinning if element is destroyed
    element.bind('$destroy', function() {
      spinner.stop();
      spinning = false;
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
  return function(scope, element, attrs) {
    scope.$watch(attrs.creditCardSelector, function(value) {
      var logo = 'all';
      var brand = null;

      if(/^4/.test(value)) {
        logo = 'visa';
        brand = 'ccard:Visa';
      }
      else if(/^5[1-5]/.test(value)) {
        logo = 'mastercard';
        brand = 'ccard:MasterCard';
      }
      else if(/^3[47]/.test(value)) {
        logo = 'amex';
        brand = 'ccard:AmericanExpress';
      }
      // 6011, 622126-622925, 644-649, 65
      else if(/^(6((011)|(22((1((2[6-9])|([3-9]{1}[0-9])))|([2-8])|(9(([0-1]{1}[0-9])|(2[0-5])))))|(4[4-9])|5))/.test(value)) {
        logo = 'discover';
        brand = 'ccard:Discover';
      }
      else if(/^62/.test(value)) {
        logo = 'china-up';
        brand = 'ccard:ChinaUnionPay';
      }

      // update brand
      scope[attrs.ngModel] = brand;

      // remove old cc-logo classes, add new
      element.removeClass(function(index, css) {
        return (css.match (/\bcc-logo-\S+/g) || []).join(' ');
      }).addClass('cc-logo-' + logo + '-selected');
    });
  };
})
.directive('duplicateChecker', function($http) {
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
      element.hide();

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
            .hide()
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
              lastCheck = scope.input;
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
.directive('tooltipTitle', function() {
  return function(scope, element, attrs) {
    attrs.$observe('tooltipTitle', function(value) {
      $(element).tooltip({
        title: value
      });
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
.directive('accountSelector', function($account) {
  function Ctrl($scope, $account) {
    $scope.accounts = $account.accounts;
    $scope.selected = null;
    $account.get(function(err, accounts) {
      if(!err) {
        $scope.selected = accounts[0] || null;
        $scope.$apply();
      }
    });
  }

  return {
    scope: {selected: '='},
    controller: Ctrl,
    templateUrl: '/partials/account-selector.html'
  };
})
.directive('budgetSelector', function(svcBudget) {
  function Ctrl($scope, svcBudget) {
    $scope.budgets = svcBudget.budgets;
    $scope.selected = null;
    svcBudget.get(function(err, budgets) {
      if(!err) {
        $scope.selected = budgets[0] || null;
        $scope.$apply();
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
.directive('modalAddAccount', function(svcModal, $account) {
  function Ctrl($scope) {
    function init() {
      $scope.data = window.data || {};
      $scope.identity = data.identity || {};
      $scope.account = {
        '@context': 'http://purl.org/payswarm/v1',
        psaPublic: []
      };
    }
    init();

    $scope.addAccount = function() {
      $scope.account.psaPublic = [];
      if($scope.accountVisibility === 'public') {
        $scope.account.psaPublic.push('label');
        $scope.account.psaPublic.push('owner');
      }

      $account.add(account, function(err) {
        if(!err) {
          $scope.close(null, account);
        }
        // FIXME: change to a directive
        var feedback = $('[name="feedback"]', target);
        website.util.processValidationErrors(feedback, target, err);
      });
    };
  }

  return svcModal.directive({
    name: 'AddAccount',
    templateUrl: '/partials/modals/add-account.html',
    controller: Ctrl,
  });
})
.directive('modalAddBudget', function(svcModal, svcBudget) {
  function Ctrl($scope) {
    function init() {
      $scope.data = window.data || {};
      $scope.identity = data.identity || {};
      $scope.budget = {
        '@context': 'http://purl.org/payswarm/v1'
      };
    }
    init();

    $scope.addBudget = function() {
      svcBudget.add(budget, function(err) {
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
.directive('modalAddPaymentToken', function(svcModal) {
  function Ctrl($scope) {
    function init() {
      $scope.data = window.data || {};
      $scope.identity = data.identity || {};
      $scope.paymentGateway = data.paymentGateway || 'Test';
      $scope.paymentType = 'ccard:CreditCard';
      $scope.label = '';
      $scope.card = {type: 'ccard:CreditCard'};
      $scope.bankAccount = {type: 'bank:BankAccount'};
      $scope.monthNumbers = window.tmpl.monthNumbers;
      $scope.years = window.tmpl.years;
    }
    init();

    $scope.addToken = function() {
      // create post data
      var data = {
        '@context': 'http://purl.org/payswarm/v1',
        label: $scope.label,
        paymentGateway: $scope.paymentGateway
      };

      // handle payment method specifics
      if($scope.paymentType === 'ccard:CreditCard') {
        data.source = $scope.card;
      }
      else if($scope.paymentType === 'bank:BankAccount') {
        data.source = $scope.bankAccount;
      }

      // FIXME: disabled temporarily
      $scope.close(null, null);
      init();
      return;

      // add payment token
      payswarm.paymentTokens.add({
        identity: $scope.identity,
        data: data,
        success: function(paymentToken) {
          $scope.close(null, paymentToken);
        },
        error: function(err) {
          // FIXME: change to a directive
          var feedback = $('[name="feedback"]', target);
          website.util.processValidationErrors(feedback, target, err);
        }
      });
    };
  }

  return svcModal.directive({
    name: 'AddPaymentToken',
    templateUrl: '/partials/modals/add-payment-token.html',
    controller: Ctrl
  });
})
.directive('modalAddIdentity', function(svcModal) {
  function Ctrl($scope) {
    $scope.baseUrl = window.location.protocol + '//' + window.location.host;
    function init() {
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
        psaPublic: []
      };
    }
    init();

    $scope.addIdentity = function() {
      // FIXME: add identity service that will add new identities to the
      // session.identities map ... also determine if we want that to be
      // a map or an array of identities
      var identity = $scope.identity[$scope.identityType];
      identity.label = $scope.identityLabel;
      identity.psaSlug = $scope.identitySlug;
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
      $scope.identities = [];
      var identityMap = window.data.session.identities;
      for(var id in identityMap) {
        $scope.identities.push(identityMap[id]);
      }
      $scope.selected = window.data.identity;
    }
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
    function init() {
      $scope.data = window.data || {};
      $scope.countries = window.tmpl.countries || {};
      $scope.identity = data.identity || {};
      $scope.originalAddress = {
        '@context': 'http://purl.org/payswarm/v1',
        type: 'vcard:Address'
      };
      $scope.validatedAddress = null;
      $scope.selectedAddress = null;

      // state in ('editing', 'adding')
      $scope.state = 'editing';
    }
    init();

    $scope.validate = function() {
      svcAddress.validate($scope.originalAddress, function(err, validated) {
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
        $scope.state = 'adding';
        $scope.$apply()
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
        init();
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
});

})(jQuery);
