module.exports = function(grunt) {
  // project configuration
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    ngtemplates: {
      myapp: {
        options: {
          // $templateCache ID will be relative to this folder
          base: 'site/static/en',
          // prepend path to $templateCache ID
          prepend: '/',
          // the module the templates will be added to
          module: {
            name: 'app.templates',
            define: true
          }
        },
        src: 'site/static/en/partials/**.html',
        dest: 'site/static/en/app/templates.min.js'
      }
    }
  });

  // plugins
  grunt.loadNpmTasks('grunt-angular-templates');

  // default tasks
  grunt.registerTask('default', ['ngtemplates']);
};
