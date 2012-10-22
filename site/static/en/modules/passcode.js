/*!
 * Password Reset Support
 *
 * @author Dave Longley
 * @author Manu Sporny
 */
(function() {

var module = angular.module('payswarm');

module.controller('PasscodeCtrl', function($scope) {
  var data = window.data = {};
  $scope.email = data.session ? data.session.profile.email : '';
  $scope.psaPasscode = data.psaPasscode || '';
  $scope.psaPasswordNew = '';
  $scope.feedback = {
    email: {text: '', error: false},
    password: {text: '', error: false}
  };

  $scope.sendReset = function() {
    // request a passcode
    payswarm.profiles.passcode({
      profile: {psaIdentifier: $scope.email},
      success: function() {
        $scope.feedback.email.text =
          'An email has been sent to you with password reset instructions.';
        $scope.feedback.email.error = false;
        $scope.$apply();
      },
      error: function(err) {
        console.log('err', err);
        // FIXME: handle feedback
        $scope.feedback.email.text = err.message;
        $scope.feedback.email.error = true;
        $scope.$apply();
        /*website.util.processValidationErrors(
          $('#passcode-feedback'), $('#request'), err);*/
      }
    });
  };

  $scope.updatePassword = function() {
    // request a password reset using the given passcode
    payswarm.profiles.password({
      profile: {
        psaIdentifier: $scope.email,
        psaPasscode: $scope.psaPasscode,
        psaPasswordNew: $scope.psaPasswordNew
      },
      success: function() {
        $scope.feedback.password.text =
          'Your password has been updated successfully.';
        $scope.feedback.password.error = false;
        $scope.$apply();
      },
      error: function(err) {
        // FIXME: handle feedback
        $scope.feedback.password.text = err.message;
        $scope.feedback.password.error = true;
        $scope.$apply();
        /*website.util.processValidationErrors(
          $('#passcode-feedback'), $('#request'), err);*/
      }
    });
  };
});

})(jQuery);
