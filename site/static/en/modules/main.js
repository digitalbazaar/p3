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
  baseUrl: '/modules',
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
    underscore: {exports: '_'},
    // FIXME: remove once assetora/whatever uses forge via AMD properly
    'forge/forge': {exports: 'forge'},
    // FIXME: port to requireJS and remove these
    'payswarm.api': {deps: ['async', 'jquery']},
    'payswarm': {deps: ['angular', 'async']},
    'payswarm.services': {deps: ['payswarm', 'payswarm.api']},
    'payswarm.directives': {deps: ['payswarm', 'iso8601', 'jquery.placeholder', 'jquery-ui', 'spin']},
    'payswarm.filters': {deps: ['payswarm']},
    'account': {deps: ['payswarm', 'payswarm.services', 'payswarm.directives', 'payswarm.filters']},
    'activity': {deps: ['payswarm', 'payswarm.services', 'payswarm.directives', 'payswarm.filters']},
    'assetora': {deps: ['payswarm', 'payswarm.services', 'payswarm.directives', 'payswarm.filters', 'zip', 'deflate', 'FileSaver', 'TypedArray', 'Blob', 'forge/pki']},
    'budget': {deps: ['payswarm', 'payswarm.services', 'payswarm.directives', 'payswarm.filters']},
    'dashboard': {deps: ['payswarm', 'payswarm.services', 'payswarm.directives', 'payswarm.filters']},
    'contentPortal': {deps: ['payswarm', 'payswarm.services', 'payswarm.directives', 'payswarm.filters']},
    'createProfile': {deps: ['payswarm', 'payswarm.services', 'payswarm.directives', 'payswarm.filters']},
    'hostedAssets': {deps: ['payswarm', 'payswarm.services', 'payswarm.directives', 'payswarm.filters']},
    'key': {deps: ['payswarm', 'payswarm.services', 'payswarm.directives', 'payswarm.filters']},
    'login': {deps: ['payswarm', 'payswarm.services', 'payswarm.directives', 'payswarm.filters']},
    'navbar': {deps: ['payswarm', 'payswarm.services', 'payswarm.directives', 'payswarm.filters']},
    'passcode': {deps: ['payswarm', 'payswarm.services', 'payswarm.directives', 'payswarm.filters']},
    'purchase': {deps: ['payswarm', 'payswarm.services', 'payswarm.directives', 'payswarm.filters']},
    'register': {deps: ['payswarm', 'payswarm.services', 'payswarm.directives', 'payswarm.filters']},
    'settings': {deps: ['payswarm', 'payswarm.services', 'payswarm.directives', 'payswarm.filters']},
    'system.dashboard': {deps: ['payswarm', 'payswarm.services', 'payswarm.directives', 'payswarm.filters']}
	}
});

require([
  'angular',
  'angular-ui',
  'bootstrap',
  'payswarm.services',
  'payswarm.directives',
  'payswarm.filters',
  'payswarm',
  'forge/forge',
  'account',
  'activity',
  'assetora',
  'budget',
  'dashboard',
  'contentPortal',
  'createProfile',
  'hostedAssets',
  'key',
  'login',
  'navbar',
  'passcode',
  'purchase',
  'register',
  'settings'
], function(angular) {
  console.log('bootstrapping...');
  angular.bootstrap(document, ['payswarm']);
  console.log('loaded');
});

})();

/*
define(
    ["angular",
    "Services/services",
    "Directives/directives",
    "Filters/filters",
    "Controllers/controllers"
    ],

    function BaseManager(angular,Services,Directives,Filters){
        var initialize = function () {

        var app = angular.module("myApp", [], function($routeProvider, $locationProvider) {

            $routeProvider.when('/', {
                templateUrl: '/templates/Main.html',
                controller: MainCtrl
            });

            $routeProvider.otherwise( { redirectTo: '/'} );

            $locationProvider.html5Mode(true);
        });

        Filters.initialize(app);

        app.factory(Services);
        app.directive(Directives);

        angular.bootstrap(document,["myApp"]);

        };
    return {
        initialize : initialize
    };
});
*/

/*
// services.js
'use strict';

define([],function(){

var services = {} ;
services.version = function() {
  return "0.1" ;
};

return services ;

});*/
