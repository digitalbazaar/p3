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
  name: 'app/main',
  mainConfigFile: 'site/static/en/app/main.js',
  out: 'site/static/en/app/main.min.js',
  preserveLicenseComments: false
})
