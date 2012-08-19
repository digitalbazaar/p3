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

  // a stack of callbacks for when modals close
  var callbacks = [];

  /**
   * Called by a modal directive when it wants to show a modal. It passes
   * the current scope, the modal element, and an optional callback for
   * when the modal closes.
   *
   * @param scope the current scope.
   * @param element the modal element.
   * @param [callback(err, value)] the modal close callback.
   */
  service.open = function(scope, element, callback) {
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

    // auto-bind any .btn-close classes here
    $('.btn-close', element).one('click', function() {
      service.close('canceled');
    });

    // set new current modal and show it
    current = element;
    current.modal({backdrop: true});
  };

  /**
   * Called by a modal directive when it wants to close a modal. It passes
   * an error (or null) and an optional return value.
   *
   * @param err an error, if one occurred.
   * @param [value] an optional return value.
   */
  service.close = function(err, value) {
    current.modal('hide');
    current = (modals.length > 0) ? modals.pop() : null;
    var callback = callbacks.pop();
    callback.fn.call(callback.scope, err, value);
  };

  return service;
});

})(jQuery);
