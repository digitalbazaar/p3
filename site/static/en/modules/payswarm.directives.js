/*!
 * PaySwarm Angular Directives
 *
 * @requires jQuery v1.7+ (http://jquery.com/)
 *
 * @author Dave Longley
 */
(function($) {

angular.module('payswarm.directives')
// FIXME: remove once webkit non-windows font difference is fixed
.directive('kredit', function() {
  return function(scope, element, attrs) {
    if($.browser.webkit) {
      attrs.$observe('kredit', function(value) {
        if(!/windows/.test(navigator.userAgent.toLowerCase())) {
          element.css('letter-spacing', '1px');
        }
      });
    }
  };
})
// IE placeholder polyfill
.directive('placeholder', function() {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function(scope, element, attrs, ngModel) {
      if(element.placeholder) {
        element.placeholder();
      }
    }
  };
})
// FIXME: polyfill until implemented in core AngularJS
.directive('ngFocus', function($parse) {
  return function(scope, element, attrs) {
    var fn = $parse(attrs.ngFocus);
    element.focus(function(event) {
      scope.$apply(function() {
        fn(scope, {$event: event});
      });
    });
  };
})
// FIXME: polyfill until implemented in core AngularJS
.directive('ngBlur', function($parse) {
  return function(scope, element, attrs) {
    var fn = $parse(attrs.ngBlur);
    element.blur(function(event) {
      scope.$apply(function() {
        fn(scope, {$event: event});
      });
    });
  };
})
.directive('focusToggle', function($parse) {
  return function(scope, element, attrs) {
    var get = $parse(attrs.focusToggle);
    var set = get.assign || angular.noop;
    element.focus(function() {
      scope.$apply(function() {
        set(scope, true);
      });
    });
    element.blur(function() {
      scope.$apply(function() {
        set(scope, false);
      });
    });
  };
})
.directive('mouseoverToggle', function($parse) {
  return function(scope, element, attrs) {
    var get = $parse(attrs.mouseoverToggle);
    var set = get.assign || angular.noop;
    element.mouseenter(function() {
      scope.$apply(function() {
        set(scope, true);
      });
    });
    element.mouseleave(function() {
      scope.$apply(function() {
        set(scope, false);
      });
    });
  };
})
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
.directive('slugIn', function($filter, $parse) {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function(scope, element, attrs, ngModel) {
      var slug = $filter('slug');
      var set = $parse(attrs.ngModel).assign || angular.noop;

      // replace with previous initial value on blur if value is blank
      var last = '';
      element.bind('focus', function(e) {
        last = ngModel.$modelValue;
      });
      element.bind('blur', function(e) {
        if(ngModel.$modelValue === '') {
          scope.$apply(function() {
            set(scope, last);
          });
        }
      });

      // ensure view is updated after any input event
      element.bind('propertychange change input keyup paste', function(e) {
        if(ngModel.$viewValue !== element.val()) {
          ngModel.$setViewValue(element.val());
        }
      });

      // always display model value (override view value)
      ngModel.$render = function() {
        element.val(ngModel.$modelValue);
      };

      // convert view value into slug
      ngModel.$parsers.push(function(v) {
        var parsed = slug(v);
        // force view to match model
        if(parsed !== ngModel.$viewValue) {
          ngModel.$setViewValue(parsed);
          ngModel.$render();
        }
        return parsed;
      });
    }
  };
})
.directive('slugOut', function($filter, $parse) {
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      var slug = $filter('slug');
      var set = $parse(attrs.slugOut).assign || angular.noop;
      element.on('propertychange change input keyup paste', function(e) {
        scope.$apply(function() {
          set(scope, slug(element.val()));
        });
      });
    }
  };
})
.directive('fadein', function($parse) {
  return {
    link: function(scope, element, attrs) {
      scope.$watch(attrs.fadein, function(value) {
        if(value) {
          element.fadeIn(function() {
            var fn = $parse(attrs.fadeinCallback) || angular.noop;
            scope.$apply(function() {
              fn(scope);
            });
          });
        }
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
            var fn = $parse(attrs.fadeoutCallback) || angular.noop;
            scope.$apply(function() {
              fn(scope);
            });
          });
        }
      });
    }
  };
})
.directive('fadeToggle', function($parse) {
  return {
    link: function(scope, element, attrs) {
      // init to hidden
      element.addClass('hide');
      scope.$watch(attrs.fadeToggle, function(value) {
        if(value) {
          if(element.is(':animated')) {
            element.stop(true, true).show();
          }
          else {
            element.fadeIn();
          }
        }
        else {
          if(element.is(':animated')) {
            element.stop(true, true).hide();
          }
          else {
            element.fadeOut();
          }
        }
      });
    }
  };
})
.directive('trackState', function($parse) {
  return {
    link: function(scope, element, attrs) {
      // init scope state object
      var get = $parse(attrs.trackState);
      var set = get.assign || angular.noop;
      var state = get(scope) || {};
      if(!('pressed' in state)) {
        state.pressed = false;
      }
      if(!('mouseover' in state)) {
        state.mouseover = false;
      }
      set(scope, state);

      // track events
      element.focus(function() {
        scope.$apply(function() {
          var state = get(scope) || {};
          state.focus = true;
          set(scope, state);
        });
      });
      element.blur(function() {
        scope.$apply(function() {
          var state = get(scope) || {};
          state.focus = false;
          set(scope, state);
        });
      });
      element.mouseenter(function() {
        scope.$apply(function() {
          var state = get(scope) || {};
          state.mouseover = true;
          set(scope, state);
        });
      });
      element.mouseleave(function() {
        scope.$apply(function() {
          var state = get(scope) || {};
          state.mouseover = false;
          set(scope, state);
        });
      });
    }
  };
})
.directive('helpToggle', function($parse) {
  return {
    link: function(scope, element, attrs) {
      // hide (use opacity to preserve layout), make element untabbable
      element.css('opacity', '0');
      element.attr('tabindex', '-1');
      element.parent().addClass('help-toggle');

      // FIXME: hacks for bootstrap, prevent wiggling during fade in/out
      if(element.parent().hasClass('input-append')) {
        element.css('margin-left', '-1px');
        element.parent().css('font-size', '0');
      }

      // init scope state object
      var get = $parse(attrs.helpToggle);
      var set = get.assign || angular.noop;
      var state = get(scope) || {};
      if(!('pressed' in state)) {
        state.pressed = false;
      }
      if(!('mouseover' in state)) {
        state.mouseover = false;
      }
      set(scope, state);

      // track events
      element.click(function(event) {
        event.preventDefault();
        scope.$apply(function() {
          var state = get(scope) || {};
          state.pressed = !state.pressed;
          state.show = state.pressed;
          if(state.pressed) {
            element.addClass('active');
          }
          else {
            element.removeClass('active');
          }
          set(scope, state);
        });
      });
      var localMouseover = false;
      var showId = null;
      element.mouseenter(function() {
        scope.$apply(function() {
          var state = get(scope) || {};
          state.mouseover = true;
          localMouseover = true;
          set(scope, state);
          if(!state.pressed) {
            // show help after a short delay
            showId = setTimeout(function() {
              scope.$apply(function() {
                state = get(scope) || {};
                if(localMouseover) {
                  state.show = true;
                }
                set(scope, state);
              });
            }, 500);
          }
        });
      });
      element.mouseleave(function() {
        scope.$apply(function() {
          var state = get(scope) || {};
          state.mouseover = false;
          localMouseover = false;
          clearTimeout(showId);
          if(!state.pressed) {
            // hide immediately
            state.show = false;
          }
          set(scope, state);
        });
      });

      function toggleElement(value) {
        if(value) {
          element.parent().addClass('help-toggle-on');
          if(element.is(':animated')) {
            // cancel current fade in/out
            element.stop(true, true).css('opacity', '1');
          }
          else {
            // use opacity to preserve layout
            $(element).animate({opacity: '1'}, 400);
          }
        }
        else {
          element.parent().removeClass('help-toggle-on');
          if(element.is(':animated')) {
            // cancel current fade in/out
            element.stop(true, true).css('opacity', '0');
          }
          else {
            // use opacity to preserve layout
            $(element).animate({opacity: '0'}, 400);
          }
        }
      }

      // when focus changes, toggle element
      var attr = attrs.helpToggle;
      var expression = attr + '.focus || ' + attr + '.mouseover';
      scope.$watch(expression, function(value) {
        // only make changes if not pressed
        var state = get(scope) || {};
        if(!state.pressed) {
          toggleElement(value);
        }
      });
    }
  };
})
.directive('progressDividend', function() {
  return function(scope, element, attrs) {
    function updateClass(divisor, dividend) {
      var class_;
      var p = parseFloat(divisor) / parseFloat(dividend) * 100;
      p = Math.max(0, Math.min(p, 100));
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
      var p = parseFloat(divisor) / parseFloat(dividend) * 100;
      p = Math.max(0, Math.min(p, 100));
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
          scope.brand = 'Visa';
        }
        else if(/^5[1-5]/.test(value)) {
          logo = 'mastercard';
          scope.brand = 'MasterCard';
        }
        else if(/^3[47]/.test(value)) {
          logo = 'amex';
          scope.brand = 'AmericanExpress';
        }
        // 6011, 622126-622925, 644-649, 65
        else if(/^(6((011)|(22((1((2[6-9])|([3-9]{1}[0-9])))|([2-8])|(9(([0-1]{1}[0-9])|(2[0-5])))))|(4[4-9])|5))/.test(value)) {
          logo = 'discover';
          scope.brand = 'Discover';
        }
        else if(/^62/.test(value)) {
          logo = 'china-up';
          scope.brand = 'ChinaUnionPay';
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
      owner: '@duplicateCheckerOwner',
      result: '=duplicateCheckerResult'
    },
    link: function(scope, element, attrs) {
      // hide feedback until input changes
      element.addClass('alert').hide();

      scope.result = false;
      var lastInput = null;
      var timer = null;
      var init = false;

      function change(value) {
        // determine if owner input is ready
        var baseUrl = window.location.protocol + '//' + window.location.host;
        var ownerReady = (scope.owner === undefined ||
          scope.owner.length > (baseUrl + '/i/').length);

        // initialized once value is defined and owner is ready
        if(!init && value !== undefined && ownerReady) {
          init = true;
        }
        if(!init) {
          return;
        }

        // stop previous check
        clearTimeout(timer);

        // nothing to check
        if(value === undefined || value.length === 0 || !ownerReady) {
          scope.result = false;
          element.hide();
        }
        else if(value !== lastInput) {
          // show checking
          element
            .removeClass('alert-error alert-success')
            .text(scope.checking)
            .fadeIn('show');
          lastInput = null;
          scope.result = false;

          // start timer to check
          timer = setTimeout(function() {
            scope.$apply(function() {
              if(value.length === 0) {
                element.hide();
              }
              else {
                timer = null;
                if(scope.type === 'email') {
                  lastCheck = scope.input;
                }
                else {
                  lastCheck = $filter('slug')(scope.input);
                }
                var data = {type: scope.type};
                if(scope.type === 'email') {
                  data.email = lastCheck;
                }
                else {
                  data.psaSlug = lastCheck;
                }
                $http.post('/identifier', $.extend(
                  data, scope.owner ? {owner: scope.owner} : {}))
                  .success(function() {
                    // available
                    scope.result = true;
                    // FIXME: hack, remove once why it is needed to update
                    // the scope is determined
                    setTimeout(function() {scope.$apply();});
                    element
                      .hide()
                      .removeClass('alert-error alert-success')
                      .addClass('alert-success')
                      .text(scope.available)
                      .fadeIn('slow');
                  })
                  .error(function(data, status) {
                    scope.result = false;
                    // FIXME: hack, remove once why it is needed to update
                    // the scope is determined
                    setTimeout(function() {scope.$apply();});
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
            });
          }, 1000);
        }
      }

      scope.$watch('input', change);
      scope.$watch('owner', function(value) {
        change(scope.input);
      });
    }
  };
})
.directive('tooltipTitle', function($timeout) {
  return function(scope, element, attrs) {
    var show = false;
    attrs.$observe('tooltipTitle', function(value) {
      if(element.data('tooltip')) {
        element.tooltip('hide');
        element.removeData('tooltip');
      }
      element.tooltip({
        title: value
      });
      if(show) {
        element.data('tooltip').show();
      }
    });
    attrs.$observe('tooltipShow', function(value) {
      if(value !== undefined) {
        var tooltip = element.data('tooltip');
        if(value === 'true') {
          show = true;
          if(tooltip) {
            tooltip.show();
          }
        }
        else {
          show = false;
          if(tooltip) {
            tooltip.hide();
          }
        }
      }
    });
  };
})
.directive('popoverTemplate', function(svcTemplateCache, $compile, $timeout) {
  // FIXME: popover needs cleanup/rewrite to handle scopes properly and
  // to better deal with placement, etc. -- but wait for bootstrap update to
  // popovers/modals
  return {
    restrict: 'A',
    scope: {
      visible: '=popoverVisible',
      minWidth: '&popoverMinWidth'
    },
    controller: function($scope) {
      // FIXME: use $watch and $parse().assign to get/set visible instead?
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
            // set initial position
            var pos = popover.getPosition(false);
            pos = {top: pos.top + pos.height, left: 0};

            // determine if the parent element has relative positioning
            // (if so, the absolute positioning of the popover will be
            // relative to the parent)
            var parent = tip.parent();
            var isRelative = parent.css('position') === 'relative';
            if(isRelative) {
              var offset = parent.offset();
              pos.top -= offset.top;
              pos.left -= offset.left;
            }

            // calculate left position and position arrow
            var right = element.offset().left + element[0].offsetWidth;
            pos.left += right - tip[0].offsetWidth;
            $('.arrow', tip).css({
              left: tip[0].offsetWidth - element[0].offsetWidth / 2 - 1
            });
            tip.css(pos);
          }

          // compile and link tooltip to scope
          $compile(tip)(scope.$new());

          // hide when pressing escape
          $(document).bind('keyup', hideOnEscape);

          // HACK: $timeout is only used here because the click that shows
          // the popover is being handled after it is shown which immediately
          // closes it
          $timeout(function() {
            // hide popover when clicking away
            $(document).bind('click', hideOnClick);
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

        // hide popover if escape is pressed
        function hideOnEscape(e) {
          if(e.keyCode === 27) {
            e.stopPropagation();
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
            $(document).unbind('keyup', hideOnEscape);
          }
        });
      });
    }
  };
})
.directive('selector', function($filter) {
  function Ctrl($scope) {
    $scope.model = {};
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
      modalTitle: '@',
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
      modalTitle: '=',
      items: '=',
      itemType: '='
    },
    transclude: true,
    templateUrl: '/partials/modals/selector.html'
  });
})
.directive('addressSelector', function() {
  function Ctrl($scope, svcIdentity, svcAddress) {
    $scope.model = {};
    $scope.services = {
      address: svcAddress.state
    };
    $scope.identity = svcIdentity.identity;
    $scope.addresses = svcAddress.addresses;
    $scope.$watch('addresses', function(addresses) {
      if(!$scope.selected || $.inArray($scope.selected, addresses) === -1) {
        $scope.selected = addresses[0] || null;
      }
    }, true);
    svcAddress.get();
  }

  function Link(scope, element, attrs) {
    attrs.$observe('fixed', function(value) {
      scope.fixed = value;
    });
  }

  return {
    scope: {
      selected: '=',
      invalid: '=',
      fixed: '@'
    },
    controller: Ctrl,
    templateUrl: '/partials/address-selector.html',
    link: Link
  };
})
.directive('accountSelector', function(svcAccount, svcIdentity) {
  function Ctrl($scope) {
    $scope.model = {};
    $scope.services = {
      account: svcAccount.state
    };
    $scope.identityId = svcIdentity.identity.id;
    updateAccounts($scope);
    $scope.$watch('accounts', function(accounts) {
      if(!accounts) {
        return;
      }
      if(!$scope.selected || $.inArray($scope.selected, accounts) === -1) {
        $scope.selected = accounts[0] || null;
      }
    }, true);
  }

  function updateAccounts($scope) {
    var identityId = $scope.identityId;
    svcAccount.get({identity: identityId}, function(err, accounts) {
      $scope.accounts = accounts;
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
    $scope.model = {};
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
    attrs.$observe('fixed', function(value) {
      scope.fixed = value;
    });

    scope.$watch('selected', function(value) {
      // set associated account
      scope.account = null;
      if(value) {
        for(var i = 0; i < scope.accounts.length; ++i) {
          var account = scope.accounts[i];
          if(value.source === account.id) {
            scope.account = account;
            break;
          }
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
      minBalance: '@',
      fixed: '@'
    },
    controller: Ctrl,
    templateUrl: '/partials/budget-selector.html',
    link: Link
  };
})
.directive('identitySelector', function() {
  function Link(scope, element, attrs) {
    attrs.$observe('fixed', function(value) {
      scope.fixed = value;
    });
  }

  return {
    scope: {
      identityTypes: '=',
      identities: '=',
      selected: '=',
      invalid: '=',
      fixed: '@'
    },
    templateUrl: '/partials/identity-selector.html',
    link: Link
  };
})
.directive('paymentTokenSelector', function(svcPaymentToken) {
  function Ctrl($scope) {
    $scope.model = {};
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
    $scope.model = {};
    $scope.feedback = {};
    $scope.loading = false;
    $scope.identityId = $scope.identityId || svcIdentity.identity.id;
    $scope.account = {
      '@context': 'https://w3id.org/payswarm/v1',
      currency: 'USD',
      psaPublic: []
    };
    $scope.accountVisibility = 'hidden';

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
          $scope.modal.close(null, account);
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
    $scope.model = {};
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

    $scope.editAccount = function() {
      var account = {
        '@context': 'https://w3id.org/payswarm/v1',
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
          $scope.modal.close(null, account);
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

    $scope.model = {};
    $scope.data = window.data || {};
    $scope.feedback = {};
    $scope.loading = false;
    $scope.identity = data.identity || {};
    $scope.budget = {
      '@context': 'https://w3id.org/payswarm/v1'
    };
    $scope.refreshChoices = [
      {label: 'Never', value: 'never'},
      {label: 'Hourly', value: 'PT1H'},
      {label: 'Daily', value: 'P1D'},
      {label: 'Weekly', value: 'P1W'},
      {label: 'Monthly', value: 'P1M'},
      {label: 'Yearly', value: 'P1Y'}
    ];
    $scope.validityChoices = [
      {label: 'Never', value: 'never'},
      {label: '1 month', value: 'P1M'},
      {label: '3 months', value: 'P3M'},
      {label: '6 months', value: 'P6M'},
      {label: '1 year', value: 'P1Y'}
    ];
    $scope.model.budgetRefreshDuration = 'never';
    $scope.model.budgetValidDuration = 'never';

    $scope.addBudget = function() {
      // budget refresh duration
      if($scope.model.budgetRefreshDuration !== 'never') {
        $scope.budget.psaRefreshInterval =
          'R/' + window.iso8601.w3cDate() + '/' +
          $scope.model.budgetRefreshDuration;
      }

      // set budget validity start date to now
      $scope.budget.psaValidityInterval = window.iso8601.w3cDate();
      if($scope.model.budgetValidDuration !== 'never') {
        // add duration
        $scope.budget.psaValidityInterval +=
          '/' + $scope.model.budgetValidDuration;
      }

      $scope.budget.source = $scope.selection.account.id;
      $scope.loading = true;
      svcBudget.add($scope.budget, function(err, budget) {
        $scope.loading = false;
        if(!err) {
          $scope.modal.close(null, budget);
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
  function Ctrl($scope, svcBudget, svcAccount) {
    $scope.selection = {
      account: null
    };

    $scope.model = {};
    $scope.data = window.data || {};
    $scope.feedback = {};
    $scope.identity = data.identity || {};
    $scope.refreshChoices = [
      {label: 'Never', value: 'never'},
      {label: 'Hourly', value: 'PT1H'},
      {label: 'Daily', value: 'P1D'},
      {label: 'Weekly', value: 'P1W'},
      {label: 'Monthly', value: 'P1M'},
      {label: 'Yearly', value: 'P1Y'}
    ];
    $scope.validityChoices = [
      {label: 'Current', value: ''},
      {label: 'Never', value: 'never'},
      {label: '1 month', value: 'P1M'},
      {label: '3 months', value: 'P3M'},
      {label: '6 months', value: 'P6M'},
      {label: '1 year', value: 'P1Y'}
    ];
    // copy source budget for editing
    $scope.budget = {};
    angular.extend($scope.budget, $scope.sourceBudget);
    // default to current value
    $scope.model.budgetRefreshDuration = svcBudget.getRefreshDuration(
      $scope.budget);
    $scope.model.budgetValidDuration = '';
    svcAccount.getOne($scope.budget.source, function(err, account) {
      // FIXME: handle error
      $scope.selection.account = account || null;
      $scope.loading = false;
    });

    $scope.editBudget = function() {
      // set all fields from UI
      var b = $scope.budget;

      // budget refresh duration
      if($scope.model.budgetRefreshDuration ===
        svcBudget.getRefreshDuration($scope.sourceBudget)) {
        b.psaRefreshInterval = undefined;
      }
      else if($scope.model.budgetRefreshDuration === 'never') {
        b.psaRefreshInterval = window.iso8601.w3cDate();
      }
      else {
        b.psaRefreshInterval =
          'R/' + window.iso8601.w3cDate() + '/' +
          $scope.model.budgetRefreshDuration;
      }

      // budget valid duration
      if($scope.model.budgetValidDuration === '') {
        b.psaValidityInterval = undefined;
      }
      else {
        // set validity start date to now
        b.psaValidityInterval = window.iso8601.w3cDate();
        if($scope.model.budgetValidDuration !== 'never') {
          // add duration
          b.psaValidityInterval += '/' + $scope.model.budgetValidDuration;
        }
      }

      var budget = {
        '@context': 'https://w3id.org/payswarm/v1',
        id: b.id,
        label: b.label,
        source: $scope.selection.account.id,
        amount: b.amount,
        // vendors not updated here
        //vendor: b.vendor,
        psaMaxPerUse: b.psaMaxPerUse,
        psaRefreshInterval: b.psaRefreshInterval,
        psaValidityInterval: b.psaValidityInterval
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
          $scope.modal.close(null, budget);
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

    $scope.model = {};
    $scope.data = window.data || {};
    $scope.monthLabels = svcConstant.monthLabels;
    $scope.years = svcConstant.years;
    $scope.feedback = {contactSupport: true};
    $scope.loading = false;
    $scope.identity = data.identity || {};
    $scope.paymentMethods =
      $scope.paymentMethods || ['CreditCard', 'BankAccount'];
    // default to first payment method
    $scope.paymentMethod = $scope.paymentMethods[0];
    $scope.label = '';
    $scope.card = {
      '@context': 'https://w3id.org/payswarm/v1',
      type: 'CreditCard'
    };
    $scope.bankAccountTypes = [
      {id: 'Checking', label: 'Checking'},
      {id: 'Savings', label: 'Savings'},
    ];
    $scope.bankAccount = {
      '@context': 'https://w3id.org/payswarm/v1',
      type: 'BankAccount',
      bankAccountType: 'Checking'
    };
    $scope.multiEnabled = ($scope.paymentMethods.length > 1);
    $scope.creditCardEnabled =
      ($scope.paymentMethods.indexOf('CreditCard') !== -1);
    $scope.bankAccountEnabled =
      ($scope.paymentMethods.indexOf('BankAccount') !== -1);

    $scope.agreementChecked = false;
    $scope.billingAddressRequired = true;
    // billing address UI depends on payment method
    $scope.$watch('scope.paymentMethod', function() {
      var isCreditCard = ($scope.paymentMethod === 'CreditCard');
      var isBankAccount = ($scope.paymentMethod === 'BankAccount');
      $scope.billingAddressRequired = isCreditCard || isBankAccount;
      $scope.agreementChecked = false;
    });

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
        '@context': 'https://w3id.org/payswarm/v1',
        label: $scope.label
      };

      // handle payment method specifics
      if($scope.paymentMethod === 'CreditCard') {
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
      else if($scope.paymentMethod === 'BankAccount') {
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
          $scope.modal.close(null, addedToken);
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

    $scope.model = {};
    $scope.feedback = {};
    $scope.loading = false;
    $scope.depositTransfer = null;
    $scope.depositDestination = null;
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

    $scope.prepare = function() {
      $scope.state = 'preparing';
    };

    $scope.review = function() {
      var verifyRequest = {
        '@context': 'https://w3id.org/payswarm/v1',
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
        $scope.feedback.verifyError = false;
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
          $scope.feedback.verifyError = true;
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
            $scope.depositTransfer = xfer;
            $scope.depositDestination = $scope.selection.destination.id;
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
          $scope.$apply();

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
    //  $scope.modal.close(null, $scope.deposit);
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
    $scope.model = {};
    $scope.feedback = {};
    $scope.loading = false;
    // identity
    $scope.identityType = $scope.identityTypes[0];
    $scope.identityLabel = '';
    $scope.identitySlug = '';
    $scope.identity = {};
    $scope.identityTypeLabels = {
      'PersonalIdentity': 'Personal',
      'VendorIdentity': 'Vendor'
    };
    angular.forEach($scope.identityTypes, function(type) {
      $scope.identity[type] = {
        '@context': 'https://w3id.org/payswarm/v1',
        type: type
      };
    });

    // account
    $scope.account = {
      '@context': 'https://w3id.org/payswarm/v1',
      label: 'Primary Account',
      psaSlug: 'primary',
      currency: 'USD',
      psaPublic: []
    };
    $scope.accountVisibility = 'hidden';

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
          $scope.modal.close(null, {identity: identity, account: account});
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
    $scope.model = {};
    $scope.identityTypes = ['PersonalIdentity', 'VendorIdentity'];
    $scope.identities = svcIdentity.identities;
    $scope.selected = svcIdentity.identity;

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
    $scope.model = {};
    $scope.data = window.data || {};
    $scope.countries = svcConstant.countries || {};
    $scope.feedback = {};
    $scope.loading = false;
    $scope.identity = $scope.identity || svcIdentity.identity;
    $scope.originalAddress = {
      '@context': 'https://w3id.org/payswarm/v1',
      type: 'Address',
      // default to US
      countryName: 'US'
    };
    $scope.selection = {
      address: null
    };
    $scope.validatedAddress = null;

    // state in ('editing', 'selecting')
    $scope.state = 'editing';

    $scope.validate = function() {
      $scope.loading = true;
      svcAddress.validate($scope.originalAddress, function(err, validated) {
        $scope.loading = false;
        $scope.feedback.error = err;
        if(err) {
          // FIXME: handle error
          console.log('validation failed', err);
          return;
        }
        // FIXME: should backend handle this?
        // copy over non-validation fields
        $scope.validatedAddress = angular.extend(validated, {
          '@context': 'https://w3id.org/payswarm/v1',
          type: 'Address',
          label: $scope.originalAddress.label,
          fullName: $scope.originalAddress.fullName
        });
        $scope.state = 'selecting';
      });
    };

    $scope.add = function(clickedAddress) {
      var addressToAdd = clickedAddress || $scope.selection.address;
      $scope.loading = true;
      svcAddress.add(addressToAdd, $scope.identity.id,
        function(err, addedAddress) {
        $scope.loading = false;
        if(!err) {
          $scope.modal.close(null, addedAddress);
        }
        $scope.feedback.error = err;
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
      identity: '=',
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
            ' Please <a target="_blank" href="/contact">contact</a> us if ' +
            'you need assistance.';
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
    $scope.model = {};
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

    $scope.prepare = function() {
      $scope.state = 'preparing';
      $scope.feedback = {};
    };

    $scope.review = function() {
      // clean deposit
      var deposit = {
        '@context': 'https://w3id.org/payswarm/v1',
        type: ['Transaction', 'Deposit'],
        payee: [{
          type: 'Payee',
          payeeGroup: ['deposit'],
          payeeRate: $scope.input.amount,
          payeeRateType: 'FlatAmount',
          payeeApplyType: 'ApplyExclusively',
          destination: $scope.account.id,
          currency: 'USD'
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
          $scope.feedback = {};

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
          $scope.feedback.contactSupport = true;
          $scope.feedback.error = err;
          $scope.$apply();
        }
      });
    };

    //$scope.done = function() {
    //  $scope.modal.close(null, $scope.deposit);
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
    $scope.model = {};
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

    $scope.prepare = function() {
      $scope.state = 'preparing';
      $scope.feedback = {};
    };

    $scope.review = function() {
      // clean withdrawal
      var withdrawal = {
        '@context': 'https://w3id.org/payswarm/v1',
        type: ['Transaction', 'Withdrawal'],
        source: $scope.account.id,
        payee: [{
          type: 'Payee',
          payeeGroup: ['withdrawal'],
          payeeRate: $scope.input.amount,
          payeeRateType: 'FlatAmount',
          payeeApplyType: 'ApplyExclusively',
          destination: $scope.input.destination.id,
          currency: 'USD',
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
          $scope.feedback = {};

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
          $scope.feedback.contactSupport = true;
          $scope.feedback.error = err;
          $scope.$apply();
        }
      });
    };

    //$scope.done = function() {
    //  $scope.modal.close(null, $scope.withdrawal);
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
