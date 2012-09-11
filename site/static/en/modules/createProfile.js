/*!
 * Profile Creation Support
 *
 * @author Dave Longley
 * @author Manu Sporny
 */
(function() {

var module = angular.module('payswarm');

module.controller('CreateProfileCtrl', function($scope, $http) {
  $scope.loading = false;
  $scope.baseUrl = window.location.protocol + '//' + window.location.host;
  $scope.data = {
    '@context': 'http://purl.org/payswarm/v1',
    email: '',
    psaPassword: '',
    psaIdentity: {
      // FIXME: add option for type in ui?
      type: 'ps:PersonalIdentity',
      label: '',
      psaSlug: '',
      psaPublic: []
    },
    account: {
      label: 'Primary',
      psaSlug: 'primary',
      psaPublic: []
    }
  };

  $scope.submit = function() {
    $scope.loading = true;
    $http.post('/profile/create', $scope.data)
      .success(function(response) {
        // redirect to referral URL
        window.location = response.ref;
      })
      .error(function(err, status) {
        $scope.loading = false;
        console.log('err', err);

        // FIXME: add validation errors
        /*
        var error = website.util.normalizeError(xhr, textStatus);
        var feedback = $('[name="create-feedback"]', form);
        if(error.type === 'monarch.validation.ValidationError') {
          website.util.processValidationErrors(feedback, form, error);
        }
        else {
          // show join failure template
          $(feedback).replaceWith(
            $('#create-failure-tmpl').tmpl({error: error}));
        }*/
      });
  };
});

})();
