/*!
 * Profile Creation Support
 *
 * @requires jQuery v1.6+ (http://jquery.com/)
 *
 * @author Dave Longley
 * @author Manu Sporny
 */
(function($) {

$(document).ready(function() {
  
  // set authority-base
  var authorityBase = window.location.protocol + '//' + window.location.host;
  $('[name="authority-base"]').text(authorityBase);

  // setup all of the tooltips
  $('[class~=auto-tooltip]').tooltip();
  
  // check duplicates
  var createForm = $('#create');
  $('[name="profile-slug"]', createForm).bind('keyup change', function() {
    website.util.checkDuplicateId(
      $(this), 'ps:Profile', $('#profile-duplicate'));
  });
  $('[name="identity-slug"]', createForm).bind('keyup change', function() {
    website.util.checkDuplicateId(
      $(this), 'ps:PersonalIdentity', $('#identity-duplicate'));
  });
  
  // bind join
  $('#create').submit(function(e) {
    // stop default submission
    e.preventDefault();
    
    // submit form
    var form = $(this);
    // FIXME: add to payswarm.api
    $.ajax({
      async: true,
      type: 'POST',
      url: '/profile/create',
      dataType: 'json',
      contentType: 'application/json',
      data: JSON.stringify({
        '@context': 'http://purl.org/payswarm/v1',
        'foaf:mbox': $('[name="email"]', form).val(),
        'rdfs:label': $('[name="profile-label"]', form).val(),
        'psa:password': $('[name="password"]', form).val(),
        'psa:slug': $('[name="profile-slug"]', form).val(),
        'psa:identity': {
          // FIXME: give option for @type
          '@type': 'ps:PersonalIdentity',
          'psa:slug': $('[name="identity-slug"]', form).val(),
          'rdfs:label': $('[name="identity-label"]', form).val()
        },
        'com:account': {
          'psa:slug': $('[name="account-slug"]', form).val(),
          'rdfs:label': $('[name="account-label"]', form).val()
        }
      }),
      beforeSend: function() {
        // clear previous errors
        var feedback = $('[name="create-feedback"]', form);
        feedback.empty();
        $('.error', form).removeClass('error');

        // disable form field input
        $(':input', form).attr('disabled', true);
      },
      success: function(response, statusText) {
        // redirect to referral URL
        window.location = response.ref;
      },
      error: function(xhr, textStatus, errorThrown) {
        // add validation errors
        var error = website.util.normalizeError(xhr, textStatus);
        var feedback = $('[name="create-feedback"]', form);
        if(error.type === 'monarch.validation.ValidationError') {
          website.util.processValidationErrors(feedback, form, error);
        }
        else {
          // show join failure template
          $(feedback).replaceWith(
            $('#create-failure-tmpl').tmpl({error: error}));
        }
        
        // re-enable form field entry
        $(':input', form).removeAttr('disabled');
      }
    });
  });
});

})(jQuery);
