/*
 * PaySwarm Gruntfile.
 *
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
module.exports = function(grunt) {
  'use strict';

  // configure w/bedrock grunt config
  var bedrockGrunt = require(__dirname + '/node_modules/bedrock/Gruntfile');
  bedrockGrunt(grunt);

  // update dirs
  var dirs = grunt.config.getRaw('dirs');
  dirs.bedrock = __dirname + '/node_modules/bedrock';
  dirs.payswarm = __dirname;
  grunt.config('dirs', dirs);

  // read package configuration
  grunt.config('pkg', grunt.file.readJSON('package.json'));

  // add templates
  var ngtemplates = grunt.config.getRaw('ngtemplates');
  ngtemplates.myapp.src.push('site/static/app/components/**/*.html');
  grunt.config('ngtemplates', ngtemplates);

  // requirejs
  var requirejs = grunt.config.getRaw('requirejs');
  var compileOptions = requirejs.compile.options;
  compileOptions.paths.payswarm = '<%= dirs.payswarm %>/site/static';
  compileOptions.paths['app/components'] = '<%= dirs.payswarm %>/site/static/app/components';
  compileOptions.paths['app/configs'] = '<%= dirs.payswarm %>/site/static/app/configs';
  compileOptions.paths['app/templates'] = '<%= dirs.payswarm %>/site/static/app/templates.min';
  compileOptions.shim = {
    // export app/bootstrap globals
    'FileSaver': {exports: 'saveAs'},
    'zip': {exports: 'zip'}
  };
  grunt.config('requirejs', requirejs);

  // jscs
  var jscs = grunt.config.getRaw('jscs');
  jscs.all.options.excludeFiles.push('<%= dirs.payswarm %>/lib/rdfa/*.js');
  grunt.config('jscs', jscs);
};
