/*!
 * Feedback directive.
 *
 * @author Dave Longley
 */
(function() {

define(['angular', 'jquery'], function(angular, $) {

var name = 'feedback';
var deps = [];
var factory = function() {
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
};

return {name: name, deps: deps, factory: factory};
});

})();
