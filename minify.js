({
  baseUrl: 'site/static/en',
  paths: {
    'angular': 'angular/angular',
    'angular-ui': 'angular/angular-ui',
    'async': 'async/async',
    'Blob': 'polyfill/Blob',
    'bootstrap': 'bootstrap/js/bootstrap',
    'deflate': 'zip/deflate',
    'FileSaver': 'filesaver/FileSaver',
    'forge': '../../../node_modules/node-forge/js',
    'iso8601': 'iso8601/iso8601',
    'jquery': 'jquery/jquery',
    'jquery.placeholder': 'jquery/jquery.placeholder',
    'jquery-ui': 'jquery-ui/js/jquery-ui',
    'spin': 'spin/spin',
    'TypedArray': 'polyfill/typedarray',
    'underscore': '../../../node_modules/underscore',
    'zip': 'zip/zip',
    // FIXME: port to requireJS
    'payswarm.api': 'legacy/payswarm.api'
  },
  shim: {
    // export globals for non-requireJS libs
    angular: {exports: 'angular', deps: ['jquery']},
    'angular-ui': {deps: ['angular', 'jquery-ui']},
    async: {exports: 'async'},
    bootstrap: {deps: ['jquery']},
    jquery: {exports: 'jQuery'},
    'jquery.placeholder': {deps: ['jquery']},
    'jquery-ui': {deps: ['jquery']},
    'spin': {exports: 'Spinner'},
    underscore: {exports: '_'},
    // FIXME: port to requireJS and remove these
    'payswarm.api': {deps: ['async', 'jquery'], exports: 'payswarm'}
    // FIXME: remove once converted to AMD and tested
    //'controllers/system.dashboard': {deps: ['payswarm', 'payswarm.services', 'payswarm.directives', 'payswarm.filters']}
	},
  name: 'app/main',
  out: 'site/static/en/app/main.min.js',
  preserveLicenseComments: false
})
