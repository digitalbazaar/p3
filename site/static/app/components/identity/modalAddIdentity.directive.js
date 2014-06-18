/*!
 * Add Identity Modal.
 *
 * @author Dave Longley
 */
define(['angular', 'payswarm.api'], function(angular, payswarm) {

var deps = ['svcModal', 'svcIdentity', 'svcAccount'];
return {modalAddIdentity: deps.concat(factory)};

function factory(svcModal, svcIdentity, svcAccount) {
  function Ctrl($scope) {
    $scope.baseUrl = window.location.protocol + '//' + window.location.host;
    $scope.model = {};
    $scope.data = window.data || {};
    $scope.feedback = {};
    $scope.loading = false;
    // identity
    $scope.identityType = $scope.identityTypes[0];
    $scope.identityLabel = '';
    $scope.identitySlug = '';
    $scope.identity = {};
    $scope.identityTypeLabels = {
      'PersonalIdentity': 'Personal',
      'VendorIdentity': 'Vendor'
    };
    angular.forEach($scope.identityTypes, function(type) {
      $scope.identity[type] = {
        '@context': payswarm.CONTEXT_URL,
        type: type
      };
    });

    // account
    $scope.account = {
      '@context': payswarm.CONTEXT_URL,
      label: 'Primary Account',
      sysSlug: 'primary',
      currency: 'USD',
      sysPublic: []
    };
    $scope.accountVisibility = 'hidden';

    $scope.addIdentity = function() {
      var identity = $scope.identity[$scope.identityType];
      identity.label = $scope.identityLabel;
      identity.sysSlug = $scope.identitySlug;
      $scope.loading = true;
      svcIdentity.add(identity, function(err, identity) {
        if(!err) {
          return addAccount(identity);
        }

        // if identity is a duplicate, add account to it
        if(err.type === 'payswarm.website.DuplicateIdentity') {
          identity.id = $scope.baseUrl + '/i/' + identity.sysSlug;
          return addAccount(identity);
        }

        $scope.loading = false;
        $scope.feedback.error = err;
      });
    };

    function addAccount(identity) {
      $scope.account.sysPublic = [];
      if($scope.accountVisibility === 'public') {
        $scope.account.sysPublic.push('label');
        $scope.account.sysPublic.push('owner');
      }

      // add account
      svcAccount.add($scope.account, identity.id, function(err, account) {
        $scope.loading = false;
        if(!err) {
          $scope.modal.close(null, {identity: identity, account: account});
        }
        // FIXME: identity vs account feedback
        $scope.feedback.error = err;
      });
    }
  }

  return svcModal.directive({
    name: 'AddIdentity',
    scope: {
      identityTypes: '='
    },
    templateUrl: '/app/templates/modals/add-identity.html',
    controller: ['$scope', Ctrl],
    link: function(scope, element, attrs) {
      scope.feedbackTarget = element;
    }
  });
}

});
