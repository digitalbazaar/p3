var config = require('../lib/config');

config.website.views.vars = {
  releaseMode: 'development',
  productionMode: false,
  googleAnalytics: {
    enabled: false,
    account: ''
  },
  session: {
    loaded: false,
    auth: false
  },
  inav: '',
  pageLayout: 'normal',
  // FIXME: remove unused vars below
  api: {
    host: '0.0.0.0',
    port: 8000
  },
  cache: {
    static: false,
    // FIXME
    key: '1.0.0-20120528155338'
  },
  debug: true,
  licenses: {
    directories: ['../licenses']
  },
  minimization: {
    css: false,
    javascript: false,
    tpl: false
  },
  title: 'PaySwarm',
  siteTitle: 'PaySwarm',
  redirect: true,
  style: {
    brand: {
      alt: 'PaySwarm',
      src: '/content/payswarm.png',
      height: '24',
      width: '182'
    },
    navbar: {
      isDark: true
    }
  },
  cssExt: 'css',
  jsExt: 'js',
  tplExt: 'tpl',
  cssList: [],
  jsList: [],
  cacheRoot: '',
  templateMap: {},
  compressedContent: {
    'application/javascript': true,
    'application/json': true,
    'application/ld+json': true,
    'application/x-shockwave-flash': true,
    'application/xml': true,
    'image/gif': true,
    'image/ico': true,
    'image/jpeg': true,
    'image/png': true,
    'image/svg+xml': true,
    'text/css': true,
    'text/html': true,
    'text/plain': true
  },
  contentTypes: {
    '.avi': 'video/x-msvideo',
    '.css': 'text/css',
    '.eot': 'application/vnd.ms-fontobject',
    '.gif': 'image/gif',
    '.gz': 'application/x-gzip',
    '.html': 'text/html',
    '.ico': 'image/ico',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.jqtpl': 'text/html',
    //'.jqtpl': 'text/x-jquery-tmpl',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.mp3': 'audio/mpeg',
    '.otf': 'application/application/octet-stream',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.swf': 'application/x-shockwave-flash',
    '.ttf': 'application/application/octet-stream',
    '.txt': 'text/plain',
    '.woff': 'application/font-woff',
    '.xml': 'application/xml',
    '.xpi': 'application/x-xpinstall',
    '.zip': 'application/zip'
  },
  // client-side data
  clientData: {
    paymentGateway: 'Test',
    productionMode: config.website.views.vars.productionMode,
    paymentDefaults: {
      allowDuplicatePurchases: true
    }
  }
};
// add demo warning template
// FIXME: include cache root automatically
config.website.views.vars.templateMap['demo-warning-tmpl'] =
  config.website.views.vars.cacheRoot +
  '/content/jqtpl/demo-warning-tmpl.html';
