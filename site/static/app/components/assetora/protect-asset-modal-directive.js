/*!
 * Protect Asset Modal.
 *
 * @author Dave Longley
 */
define([
  'angular', 'async', 'forge/pki', 'FileSaver', 'zip', 'TypedArray', 'Blob'
], function(angular, async, pki, saveAs, zip) {

/* @ngInject */
function factory(AlertService, HostedAssetService, ModalService, config) {
  return ModalService.directive({
    name: 'protectAsset',
    scope: {asset: '='},
    templateUrl: '/app/components/assetora/protect-asset-modal.html',
    link: Link
  });

  function Link(scope, element, attrs) {
    // FIXME: move over to model
    var data = config.data || {};
    scope.identity = config.data.identity || {};
    scope.feedback = {};

    scope.model = {};
    scope.model.authority = data.authority;
    scope.model.identity = scope.identity;
    scope.model.loading = false;
    scope.model.state = {
      assets: HostedAssetService.state
    };
    // FIXME: figure out how to detect this and when it isn't available,
    // hide the save button and show the files to be downloaded on
    // the page individually for cut and paste (for IE9 essentially)
    scope.model.saveAsSupported = true;
    scope.model.bundleSaved = false;
    scope.model.keypair = null;
    scope.model.bundleStep = '';

    // configure zip
    zip.useWebWorkers = (typeof Worker !== 'undefined');
    zip.workerScriptsPath = '/zip/';

    // prepare forge
    var forge = {pki: pki()};

    // private state
    var state = {};

    scope.generateBundle = function() {
      scope.model.loading = true;
      scope.model.bundleStep = 'Generating security keys';
      console.log('Generating bundle...');
      async.auto({
        getJsonLdProcessor: function(callback) {
          $.ajax({
            async: true,
            type: 'GET',
            url: '/php-json-ld/jsonld.php',
            dataType: 'text',
            success: function(response, statusText) {
              callback(null, response);
            },
            error: function(xhr, textStatus, errorThrown) {
              callback(errorThrown);
            }
          });
        },
        generateKeyPair: function(callback) {
          var bits = data.keygenOptions.bitSize;
          console.log('Generating ' + bits + '-bit key-pair...');
          forge.pki.rsa.generateKeyPair({
            bits: bits,
            workers: 2,
            /*workLoad: 100,*/
            workerScript: '/forge/prime.worker.js'
          }, callback);
        },
        sendPublicKey: ['generateKeyPair', function(callback, results) {
          scope.model.bundleStep = 'Registering generated keys';
          scope.$apply();

          var keypair = results.generateKeyPair;
          scope.model.keypair = {
            privateKey: forge.pki.privateKeyToPem(keypair.privateKey),
            publicKey: forge.pki.publicKeyToPem(keypair.publicKey)
          };

          // set asset's public key
          HostedAssetService.setKey(scope.asset.id, {
            '@context': 'https://w3id.org/payswarm/v1',
            publicKeyPem: scope.model.keypair.publicKey
          }, callback);
        }],
        generatePhpBundle: ['getJsonLdProcessor', 'sendPublicKey',
          function(callback, results) {
            scope.model.bundleStep = 'Compressing bundle';
            scope.$apply();
            writePhpBundle({
              jsonld: results.getJsonLdProcessor,
              keypair: results.generateKeyPair
            }, callback);
        }]
      }, function(err, results) {
        scope.model.success = !err;
        scope.model.loading = false;

        if(err) {
          AlertService.add('error', err);
          scope.$apply();
          return;
        }

        state.zippedBlob = results.generatePhpBundle;
        scope.$apply();
      });
    };

    scope.savePhpBundle = function() {
      // FIXME: remove console.logs
      console.log('Saving bundle...');

      saveAs(state.zippedBlob, 'protect-asset-content.zip');
      /* FIXME: these event handlers have no effect
      var saver = saveAs(state.zippedBlob, 'protect-asset-content.zip');
      saver.onerror = function(event) {
        console.log('saver error', event);
      };
      saver.onabort = function(event) {
        console.log('saver abort', event);
      };
      saver.onwriteend = function(event) {
        console.log('saver done', event);
        scope.model.bundleSaved = true;
        scope.apply();
      };*/

      scope.model.bundleSaved = true;
    };

    function writePhpBundle(options, callback) {
      var php = angular.element('#protect-asset-php').text();
      console.log('php', php);

      // FIXME: add other files to manifest
      var manifest = [{
        name: 'protect-asset-content.php',
        blob: new Blob([php], {type: 'text/plain;charset=UTF-8'})
      }, {
        name: 'jsonld.php',
        blob: new Blob([options.jsonld], {type: 'text/plain;charset=UTF-8'})
      }, {
        name: '.htaccess',
        blob: new Blob([
          'RewriteEngine On\n' +
          'RewriteRule ^(.*)$ protect-asset-content.php\n'],
          {type: 'text/plain;charset=UTF-8'})
      }];

      zip.createWriter(
        new zip.BlobWriter('application/zip'),
        function(zipWriter) {
          addEntry(zipWriter, manifest, 0);
        },
        callback);

      function addEntry(zipWriter, manifest, index) {
        // last entry written, close and pass back zip
        if(index === manifest.length) {
          return zipWriter.close(function(zippedBlob) {
            callback(null, zippedBlob);
          });
        }

        // write next entry
        var entry = manifest[index];
        zipWriter.add(entry.name, new zip.BlobReader(entry.blob), function() {
          addEntry(zipWriter, manifest, index + 1);
        });
      }
    }
  }
}

return {protectAssetModal: factory};

});
