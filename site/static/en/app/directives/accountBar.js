/*!
 * Account Bar directive.
 *
 * @author Dave Longley
 */
define([], function() {

var deps = [];
return {accountBar: deps.concat(factory)};

function factory() {
  return {
    scope: {
      account: '=accountBar'
    },
    replace: true,
    templateUrl: '/app/templates/account-bar.html',
    controller: ['$scope', function($scope) {
      var model = $scope.model = {};
      model.creditBar = 0;
      model.balanceBar = 0;
      model.barText = 0;
      model.hasCreditLine = ($scope.account ?
        parseFloat($scope.account.creditLimit || '0') > 0 : false);
    }],
    link: function(scope, element, attrs) {
      // update progress bar when account changes
      scope.$watch('account', function(account) {
        var model = scope.model;
        var balance = parseFloat(account ? account.balance : 0);
        var creditLimit = parseFloat(account ? account.creditLimit || '0' : 0);

        // calculate remaining credit
        model.remainingCredit = creditLimit;
        if(balance < 0) {
          model.remainingCredit = creditLimit + balance;
        }

        var maxBalance;

        // fill bar for a positive balance
        if(balance > 0) {
          maxBalance = balance + creditLimit;
        }
        // show remaining credit for a negative balance
        else {
          maxBalance = creditLimit;
        }

        // credit bar
        model.hasCreditLine = (creditLimit > 0);
        if(model.hasCreditLine) {
          if(balance >= 0) {
            model.creditBar = creditLimit / maxBalance * 100;
          }
          else {
            model.creditBar = -balance / maxBalance * 100;
            model.creditBar = Math.max(0, Math.min(model.creditBar, 100));
          }
        }

        // balance bar
        model.balanceBar = balance / maxBalance * 100;
        model.balanceBar = Math.max(0, Math.min(model.balanceBar, 100));

        // shared text
        model.barText = 100 / (model.creditBar + model.balanceBar) * 100;
      }, true);
    }
  };
}

});
