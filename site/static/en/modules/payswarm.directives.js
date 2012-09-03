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
.directive('tooltipTitle', function() {
  return function(scope, element, attrs) {
    attrs.$observe('tooltipTitle', function(value) {
      $(element).tooltip({
        title: value
      });
    });
  };
})
.directive('popoverTitle', function($templateCache, $timeout) {
  // precache generic popover template
  $templateCache.put(
    '/partials/popover.html', '<div data-ng-transclude></div>');
  return {
    transclude: true,
    scope: {
      title: '@popoverTitle',
      visible: '=popoverVisible'
    },
    templateUrl: '/partials/popover.html',
    replace: true,
    controller: function($scope) {
      $scope.session = window.data.session;
    },
    link: function(scope, element, attrs) {
      element.remove();

      // get popover parent element
      var el = $(attrs.popoverElement);

      el.popover({
        placement: 'bottom',
        trigger: 'manual',
        title: scope.$eval(attrs.popoverTitle),
        content: '<div></div>'
      });

      // update popover to use content element and to position properly
      var popover = el.data('popover');
      popover.setContent = function() {
        var $tip = this.tip();
        $tip.find('.popover-title').text(scope.$eval(attrs.popoverTitle));
        $tip.find('.popover-content').empty().append(element);
        $tip.removeClass('fade top bottom left right in');
      };
      var oldShow = popover.show;
      popover.show = function() {
        oldShow.call(popover);
        var $tip = this.tip();

        // get position for popover
        var pos = popover.getPosition(false);
        pos = {top: pos.top + pos.height};

        // calculate left position and position arrow
        var right = el.offset().left + el[0].offsetWidth;
        pos.left = right - $tip[0].offsetWidth;
        $('.arrow', $tip).css({
          left: $tip[0].offsetWidth - el[0].offsetWidth / 2
        });
        $tip.css(pos);

        // HACK: $timeout is only used here because the click that shows
        // the popover is being handled after it is shown which immediately
        // closes it
        $timeout(function() {
          // hide popover when clicking away
          $(document).one('click', hideOnClick);
        });
      };

      function hideOnClick(e) {
        var $tip = popover.tip();
        if($(e.target).closest($tip).length === 0) {
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
            el.addClass('active');
            el.popover('show');
          }
        }
        else if(visible) {
          visible = false;
          el.removeClass('active');
          el.popover('hide');
          $(document).unbind('click', hideOnClick);
        }
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

    $scope.addAccount = function() {
      console.log('show account modal');
      $scope.showAccountModal = true;
    };
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

    $scope.addBudget = function() {
      console.log('show budget modal');
      $scope.showBudgetModal = true;
    };
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

    $scope.addIdentity = function() {
      console.log('show identity modal');
      $scope.showIdentityModal = true;
    };
  }

  return {
    scope: {
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
      if($scope.visibility === 'public') {
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
    controller: Ctrl,
  });
})
.directive('modalSwitchIdentity', function(svcModal) {
  function Ctrl($scope) {
    function init() {
      $scope.identities = window.data.session.identities;
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
    controller: Ctrl,
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
