module.exports = function(grunt) {
  // project configuration
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    ngtemplates: {
      myapp: {
        options: {
          // the module the templates will be added to
          module: 'app.templates',
          htmlmin: {
            collapseBooleanAttributes:      true,
            collapseWhitespace:             true,
            removeAttributeQuotes:          true,
            removeComments:                 true,
            removeEmptyAttributes:          true,
            removeRedundantAttributes:      true,
            removeScriptTypeAttributes:     true,
            removeStyleLinkTypeAttributes:  true
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
        src: 'site/static/en/app/templates/**/*.html',
        dest: 'site/static/en/app/templates.min.js'
      }
    }
  });

  // plugins
  grunt.loadNpmTasks('grunt-angular-templates');

  // default tasks
  grunt.registerTask('default', ['ngtemplates']);
};
