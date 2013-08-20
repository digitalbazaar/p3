/*!
 * Budget Bar directive.
 *
 * @author Dave Longley
 */
define([], function() {

var deps = ['$timeout'];
return {budgetBar: deps.concat(factory)};

function factory($timeout) {
  return {
    scope: {
      budget: '=budgetBar'
    },
    replace: true,
    templateUrl: '/partials/budget-bar.html',
    controller: function($scope, svcBudget) {
      $scope.services = {budget: svcBudget};
    },
    link: function(scope, element, attrs) {
      var progress = $('.progress', element);
      var bar = $('.bar', progress);
      var frontText = $('.progressbar-text-front', bar);

      // update progress bar when balance or amount changes
      scope.$watch('budget', function(budget) {
        var class_;
        var balance = budget ? budget.balance : '0';
        var amount = budget ? budget.amount : '0';
        var p = parseFloat(balance) / parseFloat(amount) * 100;
        p = Math.max(0, Math.min(p, 100));
        if(p < 25) {
          class_ = 'progress-danger';
        }
        else if(p < 50) {
          class_ = 'progress-warning';
        }
        else {
          class_ = 'progress-success';
        }
        progress
          .removeClass('progress-danger')
          .removeClass('progress-info')
          .removeClass('progress-success')
          .addClass(class_);

        // update actual bar
        bar.attr('data-amount-part', balance);
        bar.attr('data-amount-total', amount);
        bar.css('width', p + '%');
        frontText.css('width', 100 / p * 100 + '%');
      }, true);
    }
  };
}

});
