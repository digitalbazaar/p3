/*!
 * Add Address Modal.
 *
 * @author Dave Longley
 */
define(['angular', 'payswarm.api'], function(angular, payswarm) {

var deps = ['svcModal', 'svcIdentity', 'svcAddress', 'svcConstant'];
return {modalAddAddress: deps.concat(factory)};

function factory(
  svcModal, svcIdentity, svcAddress, svcConstant) {
  function Ctrl($scope) {
    $scope.model = {};
    $scope.data = window.data || {};
    $scope.countries = svcConstant.countries || {};
    $scope.feedback = {};
    $scope.loading = false;
    $scope.identity = $scope.identity || svcIdentity.identity;
    $scope.originalAddress = {
      '@context': payswarm.CONTEXT_URL,
      type: 'Address',
      // default to US
      countryName: 'US'
    };
    $scope.selection = {
      address: null
    };
    $scope.validatedAddress = null;

    // state in ('editing', 'selecting')
    $scope.state = 'editing';

    $scope.validate = function() {
      $scope.loading = true;
      svcAddress.validate($scope.originalAddress, function(err, validated) {
        $scope.loading = false;
        $scope.feedback.error = err;
        if(err) {
          // FIXME: handle error
          console.log('validation failed', err);
          return;
        }
        // FIXME: should backend handle this?
        // copy over non-validation fields
        $scope.validatedAddress = angular.extend(validated, {
          '@context': payswarm.CONTEXT_URL,
          type: 'Address',
          label: $scope.originalAddress.label,
          fullName: $scope.originalAddress.fullName
        });
        $scope.state = 'selecting';
        if($scope.validatedAddress.sysValidated) {
          $scope.selection.address = $scope.validatedAddress;
        } else {
          $scope.selection.address = $scope.originalAddress;
        }
      });
    };

    $scope.add = function(clickedAddress) {
      var addressToAdd = clickedAddress || $scope.selection.address;
      $scope.loading = true;
      svcAddress.add(addressToAdd, $scope.identity.id,
        function(err, addedAddress) {
        $scope.loading = false;
        if(!err) {
          $scope.modal.close(null, addedAddress);
        }
        $scope.feedback.error = err;
      });
    };

    $scope.edit = function() {
      $scope.feedback = {};
      $scope.state = 'editing';
      $scope.selection.address = null;
    };
  }

  function Link(scope, element, attrs) {
    scope.feedbackTarget = element;
  }

  return svcModal.directive({
    name: 'AddAddress',
    scope: {
      identity: '=',
      showAlert: '@modalAddAddressAlert'
    },
    templateUrl: '/app/templates/modals/add-address.html',
    controller: ['$scope', Ctrl],
    link: Link
  });
}

});
