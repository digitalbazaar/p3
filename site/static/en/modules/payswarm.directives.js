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
.directive('selector', function() {
  function Ctrl($scope) {
    $scope.selected = ($scope.items.length > 0) ? $scope.items[0] : null;

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
.directive('modalSelector', function($modal) {
  return $modal.directive({
    name: 'Selector',
    scope: {
      items: '=',
      itemType: '='
    },
    transclude: true,
    templateUrl: '/partials/modals/selector.html'
  });
})
.directive('addressSelector', function($address) {
  function Ctrl($scope, $address) {
    $scope.addresses = $address.addresses;
    $scope.selected = null;
    $address.get(function(err, addresses) {
      if(!err) {
        $scope.selected = (addresses.length > 0) ? addresses[0] : null;
        $scope.$apply();
      }
    });

    $scope.addAddress = function() {
      console.log('show address modal');
      $scope.showAddressModal = true;
    };
  }

  return {
    scope: {selected: '='},
    controller: Ctrl,
    templateUrl: '/partials/address-selector.html'
  };
})
.directive('modalAddPaymentToken', function($modal) {
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

  return $modal.directive({
    name: 'AddPaymentToken',
    templateUrl: '/partials/modals/add-payment-token.html',
    controller: Ctrl,
  });
});

})(jQuery);
