/*!
 * Payment Token List Selector.
 *
 * @author Digital Bazaar
 */
define([], function() {

var deps = ['ModalService'];
return {paymentTokenListSelectorModal: deps.concat(factory)};

function factory(ModalService) {
  function Ctrl($scope) {
    $scope.data = window.data || {};
    $scope.feedback = {};

    var model = $scope.model = {};
    model.loading = false;
    // payment backup source selected
    model.backupSource = null;

    $scope.confirm = function() {
      $scope.modal.close(null, model.backupSource);
    };
  }

  return ModalService.directive({
    name: 'paymentTokenListSelector',
    scope: {
      instant: '=',
      omit: '='
    },
    templateUrl:
      '/app/components/payment-token/payment-token-list-selector.html',
    controller: ['$scope', Ctrl],
    link: function(scope, element) {
      scope.feedbackTarget = element;
    }
  });
}

});
