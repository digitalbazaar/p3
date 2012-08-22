/*!
 * PaySwarm Angular Services
 *
 * @requires jQuery v1.7+ (http://jquery.com/)
 *
 * @author Dave Longley
 */
(function($) {

angular.module('payswarm.services')
.factory('modals', function() {
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
      controller: options.controller,
      templateUrl: options.templateUrl,
      replace: true,
      link: function(scope, element, attrs, controller) {
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
    element.modal(modalOptions);

    // close modal when escape is pressed
    $(document).keyup(function(e) {
      if(e.keyCode === 27 && scope._open) {
        e.preventDefault();
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

    // hide parent
    if(parent) {
      parent.hasChild = true;
      parent.element.modal('hide');
    }
    // show modal
    element.modal('show');
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

    // hide modal
    modal.element.modal('hide');

    // show parent
    if(modal.parent) {
      modal.parent.hasChild = false;
      modal.parent.element.modal('show');
    }

    // call callback
    scope._callback.call(scope, {err: scope.error, result: scope.result});
  };

  return service;
});

})(jQuery);
