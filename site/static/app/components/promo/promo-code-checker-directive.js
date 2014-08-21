/*!
 * Promo Code Checker.
 *
 * @author Dave Longley
 */
define([], function() {

'use strict';

/* @ngInject */
function factory($http, AlertService) {
  return {
    restrict: 'A',
    scope: {
      input: '=psPromoCodeChecker',
      state: '=psPromoCodeCheckerState'
    },
    link: function(scope) {
      // init state object
      var state = {
        loading: false,
        promo: null,
        notFound: false,
        expired: false
      };
      scope.$watch('state', function(value) {
        if(value === undefined) {
          scope.state = state;
        }
      });

      // watch for changes to input
      var timer = null;
      scope.$watch('input', function(value) {
        // stop previous check
        clearTimeout(timer);
        state.promo = null;
        state.notFound = false;
        state.expired = false;

        // nothing to check
        if(value === undefined || value.length === 0) {
          state.loading = false;
          return;
        }

        // start countdown to do check
        state.loading = true;
        timer = setTimeout(function() {
          timer = null;

          if(scope.input.length === 0) {
            state.loading = false;
            scope.$apply();
            return;
          }

          Promise.resolve($http.get(encodeURI('/promos/' + scope.input)))
            .then(function(response) {
              // promo found
              var data = response.data;
              state.loading = false;
              var now = new Date();
              var expires = new Date(data.expires);
              if(expires <= now || data.redeemable === 0) {
                state.expired = true;
              } else {
                state.promo = data;
              }
              scope.$apply();
            })
            .catch(function(err) {
              AlertService.add('error', err);
              state.loading = false;
              state.notFound = true;
              scope.$apply();
            });
        }, 1000);
      });
    }
  };
}

return {psPromoCodeChecker: factory};

});
