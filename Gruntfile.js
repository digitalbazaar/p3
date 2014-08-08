/*
 * PaySwarm Gruntfile.
 *
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
module.exports = function(grunt) {
  'use strict';

  // init config
  grunt.initConfig({});

  // optimization flag (any require.js mode, ie, 'uglify', 'none', etc
  grunt.config('optimize',
    grunt.option('optimize') || process.env.GRUNT_OPTIMIZE || 'uglify');

  // setup config vars for templating
  grunt.config('dirs', {
    'bedrock': __dirname + '/node_modules/bedrock'
  });

  // read package configuration
  grunt.config('pkg', grunt.file.readJSON('package.json'));

  // project configuration
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.config('cssmin', {
    combine: {
      options: {
        root: '<%= dirs.bedrock %>/site/static/',
        report: 'min'
      },
      files: {
        'site/static/css/bundle.min.css': [
          '<%= dirs.bedrock %>/site/static/bootstrap/css/bootstrap.css',
          '<%= dirs.bedrock %>/site/static/bootstrap/css/bootstrap-responsive.css',
          '<%= dirs.bedrock %>/site/static/font-awesome/css/font-awesome.css',
          '<%= dirs.bedrock %>/bower_components/select2/select2.css',
          '<%= dirs.bedrock %>/bower_components/select2/select2-bootstrap.css',
          '<%= dirs.bedrock %>/bower_components/angular-stackables/stackables.css',
          '<%= dirs.bedrock %>/site/static/css/common.css',
          'site/static/css/custom.css'
        ]
      }
    }
  });

  // angular templates
  grunt.loadNpmTasks('grunt-angular-templates');
  grunt.config('ngtemplates', {
    myapp: {
      options: {
        // the module the templates will be added to
        module: 'app.templates',
        htmlmin: {
          collapseBooleanAttributes:      false,
          collapseWhitespace:             true,
          removeAttributeQuotes:          false,
          removeComments:                 true,
          removeEmptyAttributes:          false,
          removeEmptyElements:            false,
          removeRedundantAttributes:      false,
          removeScriptTypeAttributes:     false,
          removeStyleLinkTypeAttributes:  false,
          removeOptionalTags:             false
        },
        bootstrap: function(module, script) {
          return [
            "define(['angular'], function(angular) {\n",
            "angular.module('" + module + "', [])",
            ".run(['$templateCache', function($templateCache) {\n",
            script,
            '}]);\n});\n'].join('');
        },
        url: function(file) {
          var idx = file.indexOf('site/static');
          file = file.substr(idx + 'site/static'.length);
          return file;
        }
      },
      src: [
        '<%= dirs.bedrock %>/site/static/app/components/**/*.html',
        'site/static/app/components/**/*.html'
      ],
      dest: 'site/static/app/templates.min.js'
    }
  });

  // requirejs
  grunt.loadNpmTasks('grunt-contrib-requirejs');
  grunt.config('requirejs', {
    compile: {
      options: {
        baseUrl: '<%= dirs.bedrock %>/site/static',
        paths: {
          'almond': '../../node_modules/almond/almond',
          'angular': '<%= dirs.bedrock %>/bower_components/angular/angular',
          'angular-animate': '<%= dirs.bedrock %>/bower_components/angular-animate/angular-animate',
          'angular-route': '<%= dirs.bedrock %>/bower_components/angular-route/angular-route',
          'angular-sanitize': '<%= dirs.bedrock %>/bower_components/angular-sanitize/angular-sanitize',
          'angular-ui-select2': '<%= dirs.bedrock %>/bower_components/angular-ui-select2/src/select2',
          'bedrock': '.',
          'dialog-polyfill': '<%= dirs.bedrock %>/bower_components/dialog-polyfill/dialog-polyfill',
          'forge': '<%= dirs.bedrock %>/node_modules/node-forge/js',
          'iso8601': '<%= dirs.bedrock %>/lib/iso8601/iso8601',
          'jquery': '<%= dirs.bedrock %>/bower_components/jquery/dist/jquery',
          'jquery-migrate': '<%= dirs.bedrock %>/bower_components/jquery-migrate/jquery-migrate',
          'jsonld': '<%= dirs.bedrock %>/node_modules/jsonld/js/jsonld',
          'opencred-verifier': '<%= dirs.bedrock %>/node_modules/opencred-verifier/lib/credentialVerifier',
          'promise': '<%= dirs.bedrock %>/node_modules/es6-promise/dist/promise-1.0.0',
          'payswarm': '../../../../site/static',
          'select2': '<%= dirs.bedrock %>/bower_components/select2/select2',
          'stackables': '<%= dirs.bedrock %>/bower_components/angular-stackables/stackables',
          'underscore': '<%= dirs.bedrock %>/node_modules/underscore/underscore',
          // overrides
          'app/components': '../../../../site/static/app/components',
          'app/configs': '../../../../site/static/app/configs',
          'app/templates': '../../../../site/static/app/templates.min'
        },
        shim: {
          // export app/bootstrap globals
          'FileSaver': {exports: 'saveAs'},
          'zip': {exports: 'zip'}
        },
        mainConfigFile: '<%= dirs.bedrock %>/site/static/app/main.js',
        name: 'almond',
        include: ['app/main'],
        insertRequire: ['app/main'],
        out: 'site/static/app/main.min.js',
        wrap: true,
        preserveLicenseComments: false,
        optimize: grunt.config('optimize'),
        onBuildRead: function(moduleName, path, contents) {
          if(path.indexOf('site/static/app') === -1) {
            return contents;
          }
          var ngAnnotate = require('ng-annotate');
          var result = ngAnnotate(contents, {
            add: true,
            single_quotes: true
          });
          if(result.errors) {
            console.log('ng-annotate failed for ' +
              'moduleName="' + moduleName + '", path="' + path + '", ' +
              'errors=', result.errors);
            process.exit();
          }
          return result.src;
        }
      }
    }
  });

  // _jshint
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.config('jshint', {
    all: {
      src: [
       '*.js',
       'bin/*.js',
       'configs/*.js',
       'email-templates/*.js',
       'lib/*.js',
       'lib/**/*.js',
       'locales/*.js',
       'schemas/*.js',
       'site/static/app/*.js',
       'site/static/app/**/*.js',
       'test/*.js',
       'tests/*.js',
       'tests/**/*.js'
      ]
    }
  });

  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.config('less', {
    compileBootstrap: {
      options: {
        strictMath: true,
        sourceMap: false,
        outputSourceFiles: false
      },
      files: {
        'site/static/bootstrap/css/bootstrap.css': [
          '<%= dirs.bedrock %>/less/bootstrap.less',
          'less/custom.less'
        ]
      }
    }
  });

  grunt.registerTask('compile-bootstrap', ['less:compileBootstrap']);

  // default tasks
  grunt.registerTask('default', ['ngtemplates', 'cssmin', 'requirejs']);
};
