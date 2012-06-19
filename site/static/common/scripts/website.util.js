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

// logging category
var cat = 'website.util';

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
    encodeURIComponent(window.location.pathname)
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
 * Processes monarch errors in the given exception by updating
 * the feedback element with the given ID and the given target element.
 *
 * @param feedbackTarget the feedback target to update.
 * @param target the target element to update.
 * @param ex the exception.
 * @param details if true, show the exception details.
 */
util.processErrors = function(feedbackTarget, target, ex, details) {
  // clear previous feedback
  feedbackTarget.empty();

  // handle form feedback
  switch(ex.type) {
    default:
      feedbackTarget.append($.tmpl('error-tmpl', {
        tmpl: window.tmpl,
        error: ex,
        details: details
      }));
  }
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

// state used for checking duplicates
util.duplicateIdState = {};

/**
 * Checks for a duplicate ID and updates the UI.
 *
 * @param input the input widget to get input from and disable while checking.
 * @param type the @type for the value.
 * @param feedback the feedback target.
 * @param owner owner for @type (if required by @type)
 */
util.checkDuplicateId = function(input, type, feedback, owner) {
  if(!(type in util.duplicateIdState)) {
    util.duplicateIdState[type] = {
      lastCheck: null,
      duplicateTimer: null
    };
  }

  // clear any previous check
  var state = util.duplicateIdState[type];
  clearTimeout(state.duplicateTimer);

  if(input.val().length === 0) {
    // nothing to check
    feedback.hide();
  }
  else if(input.val() !== state.lastCheck) {
    // show checking alert
    feedback.show();
    $('[name="available"]', feedback).hide();
    $('[name="invalid"]', feedback).hide();
    $('[name="taken"]', feedback).hide();
    $('[name="checking"]', feedback).fadeIn('slow');
    state.lastCheck = null;

    // start timer to check
    state.duplicateTimer = setTimeout(function() {
      if(input.val().length === 0) {
        feedback.hide();
      }
      else {
        state.lastCheck = input.val();
        state.duplicateTimer = null;
        input.attr('disabled', true);
        $.ajax({
          async: true,
          type: 'POST',
          url: '/identifier',
          dataType: 'json',
          contentType: 'application/json',
          data: JSON.stringify($.extend({
            '@type': type,
            'psa:slug': state.lastCheck
          }, owner ? {'ps:owner': owner} : {})),
          success: function(response, statusText) {
            // available
            $('[name="checking"]', feedback).hide();
            $('[name="available"]', feedback).fadeIn('slow');
          },
          error: function(xhr, textStatus, errorThrown) {
            // not available/error
            $('[name="checking"]', feedback).hide();
            if(xhr.status === 400) {
              // FIXME: process and display specific exception errors
              $('[name="invalid"]', feedback).fadeIn('slow');
            } else if(xhr.status == 409) {
              $('[name="taken"]', feedback).fadeIn('slow');
            } else if(xhr.status >= 500) {
              // FIXME: support server errors
            }
          },
          complete: function() {
            input.removeAttr('disabled');
          }
        });
      }
    }, 1000);
  }
};

})(jQuery);
