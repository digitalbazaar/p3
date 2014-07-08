/*!
 * Password Reset Support.
 *
 * @author Dave Longley
 * @author Manu Sporny
 */
define(['payswarm.api'], function(payswarm) {

var deps = ['$scope'];
return {PasscodeController: deps.concat(factory)};

function factory($scope) {
  $scope.model = {};
  var data = window.data || {};
  $scope.email = data.session ? data.session.profile.email : '';
  $scope.sysPasscode = data.sysPasscode || '';
  $scope.sysPasswordNew = '';
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
      profile: {sysIdentifier: $scope.email},
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
        sysIdentifier: $scope.email,
        sysPasscode: $scope.sysPasscode,
        sysPasswordNew: $scope.sysPasswordNew
      },
      success: function() {
        $scope.feedback.password.success = {
          message: 'Your password has been updated successfully.'
        };
        $scope.$apply();
      },
      error: function(err) {
        $scope.feedback.password.error = err;
        $scope.$apply();
      }
    });
  };
}

});
