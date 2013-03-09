var config = require(__libdir + '/config');

config.website.browserVersions = {
  IE: {major: 8, minor: 0},
  Firefox: {major: 3, minor: 6},
  Opera: {major: 10, minor: 6},
  Safari: {major: 4, minor: 0},
  Chrome: {major: 17, minor: 0}
};

config.website.views.vars = {
  productionMode: false,
  supportDomain: config.server.domain,
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
  cache: {
    static: false,
    // FIXME
    key: '1.0.0-20120528155338'
  },
  debug: true,
  licenses: {
    directories: ['../licenses']
  },
  title: config.brand.name,
  siteTitle: config.brand.name,
  redirect: true,
  style: {
    brand: {
      alt: config.brand.name,
      src: '/img/payswarm.png',
      height: '24',
      width: '182'
    }
  },
  // extensions for webpage loaded resources can be adjusted to 'min.js' or
  // similar to load minimized resources
  // local resources
  cssExt: 'css',
  jsExt: 'js',
  // library resources
  cssLibExt: 'css',
  jsLibExt: 'js',
  // list of js files to load without the extension
  cssList: [],
  jsList: [],
  cacheRoot: '',
  // client-side data
  clientData: {
    siteTitle: config.brand.name,
    productionMode: false,
    paymentDefaults: {
      allowDuplicatePurchases: true
    }
  }
};

config.website.views.routes = [
  ['/', 'index.tpl'],
  '/about',
  '/legal',
  '/contact',
  ['/help', 'help/index.tpl'],
  '/help/pricing',
];
