/*!
 * Add Credit Line Modal.
 *
 * @author Dave Longley
 */
define(['jquery', 'payswarm.api'], function($, payswarm) {

var deps = ['svcModal'];
return {modalAddCreditLine: deps.concat(factory)};

function factory(svcModal) {
  function Ctrl($scope, svcAccount) {
    var data = $scope.data = window.data || {};
    $scope.feedback = {};

    var model = $scope.model = {};
    model.loading = false;
    model.profile = data.session.profile;
    model.psaPasscode = '';
    model.passcodeFeedbackTarget = $('#passcodeFeedbackTarget');
    model.verifyEmailFeedbackTarget = $('#verifyEmailFeedbackTarget');
    model.feedback = {
      passcode: {},
      email: {}
    };
    // payment backup source for account's credit line
    model.backupSource = null;
    // state in ('reviewing' and 'complete')
    model.state = 'reviewing';

    $scope.sendPasscode = function() {
      // request a passcode
      $scope.resetFeedback();
      payswarm.profiles.passcode({
        profile: {psaIdentifier: model.profile.id},
        usage: 'verify',
        success: function() {
          model.feedback.passcode.success = {
            message:
              'An email has been sent to you with verification instructions.'
          };
          $scope.$apply();
        },
        error: function(err) {
          model.feedback.passcode.error = err;
          $scope.$apply();
        }
      });
    };

    $scope.resetFeedback = function() {
      model.feedback.passcode = {};
      model.feedback.email = {};
    };

    $scope.verifyEmail = function() {
      $scope.resetFeedback();
      payswarm.profiles.verifyEmail({
        profile: {
          psaIdentifier: model.profile.id,
          psaPasscode: model.psaPasscode
        },
        success: function() {
          model.profile.psaEmailVerified = true;
          model.feedback.email.success = {
            message: 'Your email address has been verified successfully.'
          };
          $scope.$apply();
        },
        error: function(err) {
          model.feedback.email.error = err;
          $scope.$apply();
        }
      });
    };

    $scope.confirm = function() {
      model.loading = true;
      svcAccount.addCreditLine(
        $scope.account.id, model.backupSource.id, function(err) {
        model.loading = false;
        if(err) {
          model.feedback.contactSupport = true;
          model.feedback.error = err;
        }
        else {
          model.feedback = {};
          // show complete page
          model.state = 'complete';
        }
        $scope.$apply();
      });
    };
  }

  return svcModal.directive({
    name: 'AddCreditLine',
    scope: {
      account: '='
    },
    templateUrl: '/app/templates/modals/add-credit-line.html',
    controller: ['$scope', 'svcAccount', Ctrl],
    link: function(scope, element) {
      scope.feedbackTarget = element;
    }
  });
}

});
