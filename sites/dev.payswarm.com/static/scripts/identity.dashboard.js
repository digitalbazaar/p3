/*!
 * Identity Dashboard
 *
 * @requires jQuery v1.7+ (http://jquery.com/)
 *
 * @author David I. Lehn
 */
(function($) {

var data;

$(document).ready(function() {
  // alias
  data = window.data;
  
  // bind buttons
  $('#button-add-account').click(function() {
    window.modals.addAccount.show({
      identity: data.identity,
      added: function() {
        updateAccounts();
      }
    });
  });
  $('#button-add-budget').click(function() {
    window.modals.addBudget.show({
      identity: data.identity,
      added: function() {
        updateBudgets();
      }
    });
  });
  $(document).on('click', '.account .deposit', function() {
    var account = $(this).closest('.account').attr('about');
    window.modals.deposit.show({
      identity: data.identity,
      account: account,
      deposited: function() {
        updateAccounts();
      }
    });
  });
  $(document).on('click', '.account .edit', function() {
    var account = $(this).closest('.account').attr('about');
    window.modals.editAccount.show({
      identity: data.identity,
      account: account,
      success: function() {
        updateAccounts();
      }
    });
  });
  $(document).on('click', '.budget .edit', function() {
    var budget = $(this).closest('.budget').attr('about');
    window.modals.editBudget.show({
      identity: data.identity,
      budget: budget,
      success: function() {
        updateBudgets();
      }
    });
  });

  // populate data
  updateAccounts();
  updateBudgets();
});

function updateAccounts() {
  var el = $('#accounts');
  $('.loading', el).show();
  $('.noresources, .hasresources', el).hide();
  payswarm.accounts.get({
    identity: data.identity,
    success: function(accounts) {
      // update rows
      $('.loading', el).hide();
      if(accounts.length > 0) {
        $('.resources', el).html($('#accounts-tmpl').tmpl({
          tmpl: tmpl,
          accounts: accounts
        }));
        $('.hasresources', el).show();
      } else {
        $('.noresources', el).show();
      }
      
      // setup the balance tooltips
      $("[class~=auto-tooltip]").tooltip();
    },
    error: function(err) {
      console.error('updateAccounts:', err);
    }
  });
}

function updateBudgets() {
  var el = $('#budgets');
  $('.loading', el).show();
  $('.noresources, .hasresources', el).hide();
  payswarm.budgets.get({
    identity: data.identity,
    success: function(budgets) {
      // update rows
      $('.loading', el).hide();
      if(budgets.length > 0) {
        $('.resources', el).html($('#budgets-tmpl').tmpl({
          tmpl: tmpl,
          budgets: budgets
        }));
        $('.hasresources', el).show();
      } else {
        $('.noresources', el).show();
      }
    },
    error: function(err) {
      console.error('updateBudgets:', err);
    }
  });
}

})(jQuery);
