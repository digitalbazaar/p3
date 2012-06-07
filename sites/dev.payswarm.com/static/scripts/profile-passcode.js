/*!
 * Password Reset Support
 *
 * @requires jQuery v1.6+ (http://jquery.com/)
 *
 * @author Manu Sporny
 */
(function($) {

$(document).ready(function() {
  // setup all of the page tooltips
  $('[class~=auto-tooltip]').tooltip();
  
  // bind passcode request
  $('#request').submit(function(e) {
    // stop default submission
    e.preventDefault();
    
    // request a passcode
    payswarm.profiles.passcode({
      'profile': {
      'psa:identifier': $('#email').val(),
      },
      'success': function() {
        website.util.processSubmissionSuccess(
          $('#passcode-feedback'), $('#request'), 
          'An e-mail has been sent to you with password reset instructions');
      },
      'error': function(err) {
        website.util.processValidationErrors(
          $('#passcode-feedback'), $('#request'), err);
      }
    });
  });

  // bind password request
  $('#reset').submit(function(e) {
    // stop default submission
    e.preventDefault();
    
    // request a password reset using the given passcode
    payswarm.profiles.password({
      'profile': {
      'psa:identifier': $('#reset-email').val(),
      'psa:passcode': $('#passcode').val(),
      'psa:passwordNew': $('#new-password').val() 
      },
      'success': function() {
        website.util.processSubmissionSuccess(
          $('#password-feedback'), $('#reset'), 
          'Your password has been updated successfully.');
      },
      'error': function(err) {
        website.util.processValidationErrors(
          $('#password-feedback'), $('#reset'), err);
      }
    });
  });

});

})(jQuery);
