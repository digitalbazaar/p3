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
    email: {},
    password: {}
  };
  $scope.emailFeedbackTarget = $('#emailFeedbackTarget');
  $scope.passwordFeedbackTarget = $('#passwordFeedbackTarget');

  $scope.sendReset = function() {
    // request a passcode
    resetFeedback();
    payswarm.profiles.passcode({
      profile: {psaIdentifier: $scope.email},
      success: function() {
        $scope.feedback.email.success = {
          message:
            'An email has been sent to you with password reset instructions.'
        };
        $scope.$apply();
      },
      error: function(err) {
        $scope.feedback.email.error = err;
        $scope.$apply();
      }
    });
  };

  function resetFeedback() {
    $scope.feedback.email = {};
    $scope.feedback.password = {};
  }

  $scope.updatePassword = function() {
    // request a password reset using the given passcode
    resetFeedback();
    payswarm.profiles.password({
      profile: {
        psaIdentifier: $scope.email,
        psaPasscode: $scope.psaPasscode,
        psaPasswordNew: $scope.psaPasswordNew
      },
      success: function() {
        $scope.feedback.password.success = {
          message: 'Your password has been updated successfully.'
        };
        $scope.$apply();
      },
      error: function(err) {
        $scope.feedback.password.error = err
        $scope.$apply();
      }
    });
  };
});

})(jQuery);
