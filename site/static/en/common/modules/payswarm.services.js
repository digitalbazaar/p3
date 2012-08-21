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

  // previous modals and the current open modal
  var modals = [];
  var current = null;

  // a stack of states for when modals close
  var callbacks = [];

  /**
   * Creates a customized modal directive. The return value of this
   * method should be passed to a module's directive method.
   *
   * @param options the directive options.
   *          templateUrl the URL to the template for the modal.
   *          [controller] the controller for the modal.
   *          [link] the a custom link function.
   *
   * @return the directive configuration.
   */
  /*
  service.directive = function(options) {
    options.controller = options.controller || angular.noop;
    options.link = options.link || angular.noop;
    return {
      templateUrl: options.templateUrl,
      scope: {
        visible: '@',
        callback: '&',
        show: '='
      },

      compile: function(scope, element, attrs) {

      replace: false,
      controller: AddPaymentTokenCtrl,
      link: function(scope, element, attrs) {
        modals.watch(scope, element, attrs);
      }
    };
  };*/

  /**
   * Watch the given element's modal attributes for changes; open or close
   * the modal associated with the element as appropriate.
   *
   * @param scope the scope for the modal.
   * @param element the element for the modal.
   * @param attrs the attributes of the element.
   */
  service.watch = function(scope, element, attrs) {
    var modalEnter = attrs.modalEnter || 'false';
    if(!scope.$eval(modalEnter)) {
      // disable enter key
      element.keypress(function(e) {
        if(e.keyCode === 13) {
          e.preventDefault();
        }
      });
    }

    console.log('element', element);

    // open modal when expression is true, close when false
    var opened = false;
    scope.$watch('visible', function(value) {
      console.log('watch', scope);
      console.log('value', value);
      if(value) {
        if(!opened) {
          opened = true;
          open(scope, element, scope.callback);
        }
      }
      else if(opened) {
        opened = false;
        element.modal('hide');
      }
    });
  };

  /**
   * Shows a modal.
   *
   * @param scope the current scope.
   * @param element the modal element.
   * @param [callback(err, value)] the modal close callback.
   */
  function open(scope, element, callback) {
    // clear error and result
    scope.error = null;
    scope.result = null;

    callbacks.push({
      scope: scope,
      fn: callback || angular.noop
    });

    // show current (parent) once the modal hides
    if(current) {
      var parent = current;
      modals.push(parent);
      element.one('show', function() {
        parent.modal('hide');
      });
    }

    // close modal when hidden
    element.one('hide', function() {
      close();
    });

    // auto-bind any .btn-close classes here
    $('.btn-close', element).one('click', function(e) {
      scope.error = 'canceled';
      element.modal('hide');
      e.preventDefault();
    });

    // set new current modal and show it
    current = element;
    current.modal({backdrop: true});
  }

  /**
   * Called by a modal directive when it wants to close a modal.
   */
  function close() {
    current = (modals.length > 0) ? modals.pop() : null;
    var callback = callbacks.pop();
    var scope = callback.scope;
    scope[callback.visibility] = false;
    callback.fn.call(scope, scope.error, scope.result);
  };

  return service;
});

})(jQuery);
