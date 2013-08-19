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
  baseUrl: '/app',
  // FIXME: change baseUrl to '/' and remove these paths?
  paths: {
    'angular': '../angular/angular',
    'angular-ui': '../angular/angular-ui',
    'async': '../async/async',
    'Blob': '../polyfill/Blob',
    'bootstrap': '../bootstrap/js/bootstrap',
    'deflate': '../zip/deflate',
    'FileSaver': '../filesaver/FileSaver',
    'iso8601': '../iso8601/iso8601',
    'jquery': '../jquery/jquery',
    'jquery.placeholder': '../jquery/jquery.placeholder',
    'jquery-ui': '../jquery-ui/js/jquery-ui',
    'spin': '../spin/spin',
    'TypedArray': '../polyfill/typedarray',
    'underscore': '../underscore/underscore',
    'zip': '../zip/zip',
    'forge': '../forge',
    // FIXME: port to requireJS
    'payswarm.api': '../legacy/payswarm.api'
	},
	shim: {
    // export globals for non-requireJS libs
    angular: {exports: 'angular', deps: ['jquery']},
    'angular-ui': {deps: ['angular']},
    async: {exports: 'async'},
    bootstrap: {deps: ['jquery']},
    jquery: {exports: 'jQuery'},
    'jquery.placeholder': {deps: ['jquery']},
    'jquery-ui': {deps: ['jquery']},
    'spin': {exports: 'Spinner'},
    underscore: {exports: '_'},
    // FIXME: port to requireJS and remove these
    'payswarm.api': {deps: ['async', 'jquery'], exports: 'payswarm'},
    //'payswarm': {deps: ['angular', 'async']},
    //'payswarm.services': {deps: ['payswarm', 'payswarm.api']},
    // FIXME: move forge dependency once directives are split
    //'payswarm.directives': {deps: ['payswarm', 'iso8601', 'jquery.placeholder', 'jquery-ui', 'spin', 'forge/forge']},
    //'controllers/assetora': {deps: ['payswarm', 'payswarm.services', 'payswarm.directives', 'payswarm.filters', 'zip', 'deflate', 'FileSaver', 'TypedArray', 'Blob']},
    // FIXME: remove once converted to AMD and tested
    'controllers/system.dashboard': {deps: ['payswarm', 'payswarm.services', 'payswarm.directives', 'payswarm.filters']}
	}
});

require(['app'], function() {});

})();
