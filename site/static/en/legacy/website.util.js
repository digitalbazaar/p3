/*!
 * PaySwarm Website Utilities
 *
 * @requires jQuery v1.3 or later (http://jquery.com/)
 *
 * @author David I. Lehn <dlehn@digitalbazaar.com>
 */
(function($) {

// util API
window.website = window.website || {};
var util = window.website.util = window.website.util || {};

/**
 * Regex for escapeId().
 */
var escapeIdRegex = /(:|\.)/g;

/**
 * Escape ':' and '.' in ids.
 * Adapted from: http://docs.jquery.com/Frequently_Asked_Questions#How_do_I_select_an_element_by_an_ID_that_has_characters_used_in_CSS_notation.3F
 */
util.escapeId = function(id) {
  return '#' + id.replace(escapeIdRegex,'\\$1');
};

/**
 * Redirect to login page and return to current page.
 */
util.redirect = function() {
  window.location = '/profile/login?ref=' +
    encodeURIComponent(window.location.pathname);
};

/**
 * Normalizes an error that occurred during an XHR.
 *
 * @param xhr the XHR.
 * @param textStatus the error status as text.
 *
 * @return the normalized error.
 */
util.normalizeError = function(xhr, textStatus) {
  try {
    var error = JSON.parse(xhr.responseText);
    if(error.type === undefined) {
      error.type = 'website.Exception';
      error.message = 'Request Error: ' + textStatus;
      // FIXME: make message user-friendly
    }
    // check for invalid session or missing session
    else if(error.type === 'monarch.ws.AccessDenied' &&
      error.cause && error.cause.type === 'payswarm.website.InvalidSession') {
      // redirect to login
      // FIXME: support modal login to keep current state vs forced redirect
      util.redirect();
    }
  }
  catch(e) {
    // not a json-formatted exception
    var error = {
      type: 'website.Exception',
      message: 'Request Error: ' + textStatus
      // FIXME: make message user-friendly
    };
  }
  return error;
};

/**
 * Processes a form submission success by displaying some text into
 * by updating the feedback element with the given ID and the given
 * target element with some given text.
 *
 * @param feedbackTarget the feedback target to update.
 * @param target the target element to update.
 * @param txt the feedback success text to display.
 */
util.processSubmissionSuccess = function(feedbackTarget, target, txt) {
  // clear previous feedback
  $('[data-binding]', target).removeClass('error');
  feedbackTarget.empty();

  // add error feedback
  feedbackTarget.removeClass("alert-error");
  feedbackTarget.removeClass("alert-info");
  feedbackTarget.addClass('alert');
  feedbackTarget.addClass('alert-success');
  feedbackTarget.text(txt);
};

/**
 * Processes monarch validation errors in the given exception by updating
 * the feedback element with the given ID and the given target element.
 *
 * @param feedbackTarget the feedback target to update.
 * @param target the target element to update.
 * @param ex the exception.
 */
util.processValidationErrors = function(feedbackTarget, target, ex) {
  // clear previous feedback
  $('[data-binding]', target).removeClass('error');
  feedbackTarget.empty();

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
};

})(jQuery);
