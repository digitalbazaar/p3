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

    var model = $scope.model = {};
    model.loading = false;
    model.profile = data.session.profile;
    model.sysPasscode = '';
    model.passcodeFeedbackTarget = $('#passcodeFeedbackTarget');
    model.verifyEmailFeedbackTarget = $('#verifyEmailFeedbackTarget');
    model.feedback = {};
    // payment backup source for account's credit line
    model.backupSource = null;
    // state in ('reviewing' and 'complete')
    model.state = 'reviewing';

    $scope.sendPasscode = function() {
      // request a passcode
      $scope.resetFeedback();
      payswarm.profiles.passcode({
        profile: {sysIdentifier: model.profile.id},
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
      model.feedback.modal = {};
    };
    $scope.resetFeedback();

    $scope.verifyEmail = function() {
      $scope.resetFeedback();
      payswarm.profiles.verifyEmail({
        profile: {
          sysIdentifier: model.profile.id,
          sysPasscode: model.sysPasscode
        },
        success: function() {
          model.profile.sysEmailVerified = true;
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
      $scope.resetFeedback();
      svcAccount.addCreditLine(
        $scope.account.id, model.backupSource.id, function(err) {
        model.loading = false;
        if(err) {
          model.feedback.modal.contactSupport = true;
          model.feedback.modal.error = err;
        } else {
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
    templateUrl: '/app/components/account/add-credit-line-modal.html',
    controller: ['$scope', 'svcAccount', Ctrl],
    link: function(scope, element) {
      scope.feedbackTarget = element;
    }
  });
}

});
