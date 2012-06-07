/*!
 * Login Support
 *
 * @requires jQuery v1.6+ (http://jquery.com/)
 *
 * @author Dave Longley
 */
(function($) {

$(document).ready(function() {
  
  // set authority-base
  var authorityBase = window.location.protocol + '//' + window.location.host;
  $('[name="authority-base"]').text(authorityBase);

  // bind sign in
  $('#login').submit(function(e) {
    // stop default submission
    e.preventDefault();
    
    // disable form field input
    var form = $(this);
    $(':input', form).attr('disabled', true);
    
    // do login
    var ref = $('[name="ref"]', form).val();
    payswarm.profiles.login({
      profile: $('[name="profile"]', form).val(),
      password: $('[name="password"]', form).val(),
      ref: ref,
      success: function(response) {
        if(response.ref) {
          // redirect to referral URL
          window.location = response.ref;
        }
        // FIXME: hack for demo, redir to full login page, change to replace
        // page content in the future with sign in page and profile selector
        else if(window.location.pathname !== '/profile/login') {
          window.location = '/profile/login';
        }
        else {
          // show multiple profiles
          $('#login').replaceWith($('#login-multiple-tmpl').tmpl({
            email: response['foaf:mbox'],
            profiles: response['ps:profile'],
            ref: ref
          }));
          
          $('#login').submit(function(e) {
            e.preventDefault();
            
            // disable form field input
            form = $(this);
            $(':input', form).attr('disabled', true);
            
            // do login
            payswarm.profiles.login({
              profile: $('[name="profile"] option:selected', form).val(),
              password: $('[name="password"]', form).val(),
              ref: ref,
              success: function(response) {
                if(response.ref) {
                  // redirect to referral URL
                  window.location = response.ref;
                }
                else {
                  // re-enable form field entry
                  $(':input', form).removeAttr('disabled');
                }
              },
              error: function(err) {
                // add validation errors
                var feedback = $('[name="login-feedback"]', form);
                website.util.processValidationErrors(feedback, form, err);
                feedback.show();
                
                // re-enable form field entry
                $(':input', form).removeAttr('disabled');
              }
            });
          });
          
          // re-enable form field entry
          $(':input', form).removeAttr('disabled');
        }
      },
      error: function(err) {
        var feedback = $('[name="login-feedback"]', form);
        website.util.processValidationErrors(feedback, form, err);
        if(err.type === 'monarch.validation.ValidationError') {
          feedback.text(
            'Please enter a profile or email address and a password.');
        }
        // add validation errors
        $('#signin-button').tooltip({
          placement: 'bottom',
          title: function() {return feedback.text();},
          trigger: 'manual',
        }).tooltip('show');
        setTimeout(function() {
          $('#signin-button').tooltip('hide');
        }, 2000);
        
        // re-enable form field entry
        $(':input', form).removeAttr('disabled');
      }
    });
  });
});

})(jQuery);
