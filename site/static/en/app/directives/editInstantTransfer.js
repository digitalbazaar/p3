/*!
 * Edit Instant Transfer Directive.
 *
 * @author Dave Longley
 */
define([], function() {

var deps = [];
return {editInstantTransfer: deps.concat(factory)};

function factory() {
  return {
    scope: {
      model: '='
    },
    templateUrl: '/partials/edit-instant-transfer.html',
    link: function(scope, element) {
      // FIXME: watch $scope.model.backupSource for changes?
      // display backupSource(s) to be used for instant transfer in template?
    }
  };
}

});
