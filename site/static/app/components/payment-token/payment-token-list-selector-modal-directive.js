/*!
 * Payment Token List Selector.
 *
 * @author Digital Bazaar
 */
define([], function() {

var deps = ['ModalService'];
return {paymentTokenListSelectorModal: deps.concat(factory)};

function factory(ModalService) {
  return ModalService.directive({
    name: 'paymentTokenListSelector',
    scope: {
      instant: '=',
      omit: '='
    },
    templateUrl:
      '/app/components/payment-token/payment-token-list-selector.html',
    link: Link
  });

  function Link(scope) {
    var model = scope.model = {};
    model.loading = false;
    // payment backup source selected
    model.backupSource = null;

    scope.confirm = function() {
      scope.modal.close(null, model.backupSource);
    };
  }
}

});
