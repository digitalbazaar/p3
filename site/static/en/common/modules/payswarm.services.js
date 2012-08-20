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
   * Watch the given element's modal attributes for changes; open or close
   * the modal associated with the element as appropriate.
   *
   * @param scope the scope for the modal.
   * @param element the element for the modal.
   * @param attrs the attributes of the element.
   */
  service.watch = function(scope, element, attrs) {
    if(!scope.$eval(attrs.modalEnter)) {
      // disable enter key
      element.keypress(function(e) {
        if(e.keyCode === 13) {
          e.preventDefault();
        }
      });
    }

    // open modal when expression is true, close when false
    var opened = false;
    scope.$watch(attrs.modalShow, function(value) {
      if(value && !opened) {
        opened = true;
        open(scope, element, attrs.modalShow, scope[attrs.modalCallback]);
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
   * @param visibility the scope variable that determines show/hide.
   * @param [callback(err, value)] the modal close callback.
   */
  function open(scope, element, visibility, callback) {
    // clear error and result
    scope.error = null;
    scope.result = null;

    callbacks.push({
      scope: scope,
      visibility: visibility,
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
