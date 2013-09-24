/*!
 * Account Balance directive.
 *
 * @author Dave Longley
 */
define([], function() {

var deps = [];
return {accountBalance: deps.concat(factory)};

function factory() {
  return {
    scope: {
      account: '=accountBalance'
    },
    replace: true,
    templateUrl: '/partials/account-balance.html',
    link: function(scope, element, attrs) {
      scope.$watch('account', function(account) {
        scope.isNegative = parseFloat(account.balance) < 0;
      });
    }
  };
}

});
