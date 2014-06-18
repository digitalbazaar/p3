/*!
 * Profile Creation Controller.
 *
 * @author Dave Longley
 * @author Manu Sporny
 */
define([], function() {

var deps = ['$scope', '$http'];
return {CreateProfileCtrl: deps.concat(factory)};

function factory($scope, $http) {
  $scope.model = {};
  $scope.data = window.data || {};
  $scope.feedback = {};
  // FIXME: temporary code to be removed after feedback improvements.
  //      : also remove the id fom the form in create.html.
  $scope.feedbackTarget = $('#createProfileFeedbackTarget');
  $scope.loading = false;
  $scope.baseUrl = window.location.protocol + '//' + window.location.host;
  $scope.profile = {
    '@context': 'https://w3id.org/payswarm/v1',
    email: '',
    sysPassword: '',
    sysIdentity: {
      // FIXME: add option for type in ui?
      type: 'PersonalIdentity',
      label: '',
      sysSlug: '',
      sysPublic: []
    },
    account: {
      label: 'Primary',
      sysSlug: 'primary',
      sysPublic: []
    }
  };
  $scope.agreementChecked = false;

  $scope.submit = function() {
    $scope.loading = true;
    $http.post('/profile/create', $scope.profile)
      .success(function(response) {
        // redirect to referral URL
        window.location = response.ref;
      })
      .error(function(err, status) {
        $scope.loading = false;
        $scope.feedback.error = err;
      });
  };
}

});
