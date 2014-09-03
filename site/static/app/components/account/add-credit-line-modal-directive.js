/*!
 * Add Credit Line Modal.
 *
 * @author Dave Longley
 */
define([], function() {

'use strict';

/* @ngInject */
function factory(
  $rootScope, brAlertService, brIdentityService, psAccountService) {
  return {
    restrict: 'A',
    scope: {account: '=psAccount'},
    require: '^stackable',
    templateUrl: '/app/components/account/add-credit-line-modal.html',
    link: Link
  };

  function Link(scope) {
    var model = scope.model = {};
    model.identity = brIdentityService.identity;
    model.sysPasscode = '';
    // payment backup source for account's credit line
    model.backupSource = null;
    // state in ('reviewing' and 'complete')
    model.state = 'reviewing';
    model.loading = false;

    scope.sendPasscode = function() {
      // request a passcode
      model.loading = true;
      brAlertService.clearFeedback();
      brIdentityService.sendPasscode({
        sysIdentifier: model.identity.id,
        usage: 'verify'
      }).then(function() {
        brAlertService.add('success', {
          message:
            'An email has been sent to you with verification instructions.'
        }, {scope: scope});
      }).catch(function(err) {
        brAlertService.add('error', err, {scope: scope});
      }).then(function() {
        model.loading = false;
        scope.$apply();
      });
    };

    scope.verifyEmail = function() {
      model.loading = true;
      brAlertService.clearFeedback();
      brIdentityService.verifyEmail(model.sysPasscode).then(function() {
        model.identity.sysEmailVerified = true;
        brAlertService.add('success', {
          message: 'Your email address has been verified successfully.'
        });
      }).catch(function(err) {
        if(err.type === 'bedrock.website.PermissionDenied') {
          $rootScope.$emit('showLoginModal');
        }
        brAlertService.add('error', err, {scope: scope});
      }).then(function() {
        model.loading = false;
        scope.$apply();
      });
    };

    scope.confirm = function() {
      model.loading = true;
      brAlertService.clearFeedback();
      psAccountService.addCreditLine(
        scope.account.id, model.backupSource.id).then(function() {
        // show complete page
        model.state = 'complete';
      }).catch(function(err) {
        brAlertService.add('error', err, {scope: scope});
      }).then(function() {
        model.loading = false;
        scope.$apply();
      });
    };
  }
}

return {psAddCreditLineModal: factory};

});
