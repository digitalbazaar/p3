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
    templateUrl: '/app/templates/account-balance.html',
    link: function(scope, element, attrs) {
      scope.$watch('account', function(account) {
        var balance = account ? account.balance : 0;
        scope.isNegative = parseFloat(balance) < 0;
      }, true);
    }
  };
}

});
