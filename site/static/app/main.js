/*!
 * RequireJS config.
 *
 * @author Dave Longley
 */
(function() {

// define console.log for IE
window.console = window.console || {};
window.console.log = window.console.log || function() {};

require.config({
  baseUrl: '/',
  paths: {
    angular: 'angular/angular',
    async: 'async/async',
    Blob: 'polyfill/Blob',
    bootstrap: 'bootstrap/js/bootstrap',
    deflate: 'zip/deflate',
    FileSaver: 'filesaver/FileSaver',
    iso8601: 'iso8601/iso8601',
    jquery: 'jquery/jquery',
    'jquery.placeholder': 'jquery/jquery.placeholder',
    spin: 'spin/spin',
    TypedArray: 'polyfill/typedarray',
    'ui-bootstrap': 'angular-ui/ui-bootstrap-tpls',
    'ui-utils': 'angular-ui/ui-utils',
    'ui-utils-ieshiv': 'angular-ui/ui-utils-ieshiv',
    underscore: 'underscore/underscore',
    zip: 'zip/zip',
    // FIXME: port to requireJS
    'payswarm.api': 'legacy/payswarm.api'
  },
  shim: {
    // export globals for non-requireJS libs
    angular: {exports: 'angular', deps: ['jquery']},
    async: {exports: 'async'},
    bootstrap: {deps: ['jquery']},
    'FileSaver': {exports: 'saveAs'},
    jquery: {exports: 'jQuery'},
    'jquery.placeholder': {deps: ['jquery']},
    'spin': {exports: 'Spinner'},
    'ui-bootstrap': {deps: ['angular']},
    'ui-utils': {deps: ['angular', 'ui-utils-ieshiv']},
    underscore: {exports: '_'},
    'zip': {exports: 'zip'},
    // FIXME: port to requireJS and remove these
    'payswarm.api': {deps: ['async', 'jquery'], exports: 'payswarm'}
    // FIXME: remove once converted to AMD and tested
    //'controllers/system.dashboard': {deps: ['payswarm', 'payswarm.services', 'payswarm.directives', 'payswarm.filters']}
  }
});

require(['app/app'], function() {});

})();
