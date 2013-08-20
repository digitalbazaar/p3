({
  baseUrl: 'site/static/en',
  paths: {
    'forge': '../../../node_modules/node-forge/js',
    'underscore': '../../../node_modules/underscore',
    // override templates
    'app/templates': 'app/templates.min'
  },
  name: 'app/main',
  mainConfigFile: 'site/static/en/app/main.js',
  out: 'site/static/en/app/main.min.js',
  preserveLicenseComments: false
})
