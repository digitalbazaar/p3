/*!
 * Bootstraps the Main App module via custom code.
 *
 * Copyright (c) 2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 */
define([], function() {

require.config({
  paths: {
    async: 'async/async',
    Blob: 'polyfill/Blob',
    FileSaver: 'filesaver/FileSaver',
    TypedArray: 'polyfill/typedarray',
    deflate: 'zip/deflate',
    zip: 'zip/zip',
    // FIXME: remove
    'payswarm.api': 'legacy/payswarm.api'
  },
  shim: {
    // export globals for non-requireJS libs
    'FileSaver': {exports: 'saveAs'},
    'zip': {exports: 'zip'},
    // FIXME: remove
    'payswarm.api': {deps: ['async', 'jquery'], exports: 'payswarm'}
  }
});

});
