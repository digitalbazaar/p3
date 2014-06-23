/*!
 * Budget Bar directive.
 *
 * @author Dave Longley
 */
define([], function() {

var deps = [];
return {budgetBar: deps.concat(factory)};

function factory() {
  return {
    scope: {
      budget: '=budgetBar'
    },
    replace: true,
    templateUrl: '/app/components/budget/budget-bar.html',
    controller: ['$scope', function($scope) {
      var model = $scope.model = {};
      model.barPercentage = 0;
      model.textPercentage = 0;
    }],
    link: function(scope, element, attrs) {
      // update progress bar when balance or amount changes
      scope.$watch('budget', function(budget) {
        var model = scope.model;
        var balance = budget ? budget.balance : '0';
        var amount = budget ? budget.amount : '0';
        model.barPercentage = parseFloat(balance) / parseFloat(amount) * 100;
        model.barPercentage = Math.max(0, Math.min(model.barPercentage, 100));
        model.textPercentage = 100 / model.barPercentage * 100;
      }, true);
    }
  };
}

});
