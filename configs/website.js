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
      src: '/img/payswarm.png',
      height: '24',
      width: '182'
    },
    navbar: {
      isDark: true
    }
  },
  cssExt: 'css',
  jsExt: 'js',
  jsList: [],
  cacheRoot: '',
  // client-side data
  clientData: {
    paymentGateway: 'Test',
    productionMode: config.website.views.vars.productionMode,
    paymentDefaults: {
      allowDuplicatePurchases: true
    }
  }
};
