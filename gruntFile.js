'use strict';

var port = process.env.PORT || 3000;

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    jshint: {
      files: ['public/javascripts/*.js'],
      options: {
        "curly": true,
        "eqeqeq": true,
        "immed": true,
        "latedef": true,
        "newcap": true,
        "noarg": true,
        "sub": true,
        "undef": true,
        "boss": true,
        "eqnull": true,
        "evil": true,
        "es5": false,
        "globals": {
          "define": true,
          "context": true,
          "requirejs": true,
          "describe": true,
          "it": true,
          "beforeEach": true,
          "angular": true,
          "$": true,
          "alert": true,
          "console": true,
          "require": true,
          "nokia": true,
          "saveAs": true,
          "Handsontable": true
        }
      }
    },
    jsbeautifier: {
      files: ['public/javascripts/*.js','app.js','public/stylesheets/*.css','routes/*.js','models/*.js'],
      options: {
        js: {
          "indent_size": 2,
          "indent_char": " ",
          "indent_level": 0,
          "indent_with_tabs": false,
          "preserve_newlines": true,
          "max_preserve_newlines": 3,
          "jslint_happy": false,
          "brace_style": "collapse",
          "keep_array_indentation": false,
          "keep_function_indentation": false,
          "space_before_conditional": true,
          "eval_code": false,
          "indent_case": false,
          "unescape_strings": false
        },
        css: {
          indentChar: " ",
          indentSize: 4
        }
      }
    },

    express: {
      dev: {
        options: {
          script: './bin/www'
        }
      }
    },

    open: {
      dev: {
        url: 'http://localhost:' + port
      }
    },
  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks("grunt-jsbeautifier");
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-express-server');
  grunt.loadNpmTasks('grunt-keepalive');
  grunt.loadNpmTasks('grunt-open');

  /**
   * User to Format all Client and Server Side Javascripts files
   */
  grunt.registerTask('format', "", ['jsbeautifier', 'jshint']);

  /**
   * Use to run karma test, format all cient and server side javascripts files,
   */
  grunt.registerTask('dev', "Starts server and client - for development", ['jsbeautifier', 'jshint', 'express:dev', 'open:dev', 'keepalive']);
};
