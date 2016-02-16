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
    concurrent: {
      dev: {
        tasks: ['nodemon', 'node-inspector', 'watch'],
        options: {
          logConcurrentOutput: true
        }
      }
    },
    nodemon: {
      dev: {
        script: './bin/www',
        options: {
          env: {
            PORT: port
          },
          // omit this property if you aren't serving HTML files and
          // don't want to open a browser tab on start
          callback: function (nodemon) {
            nodemon.on('log', function (event) {
              console.log(event.colour);
            });

            // opens browser on initial server start
            nodemon.on('config:update', function () {
              // Delay before server listens on port
              setTimeout(function() {
                require('open')('http://localhost:'+ port);
              }, 1000);
            });

            // refreshes browser when server reboots
            nodemon.on('restart', function () {
              // Delay before server listens on port
              setTimeout(function() {
                require('fs').writeFileSync('.rebooted', 'rebooted');
              }, 1000);
            });
          }
        }
      }
    },
    watch: {
      server: {
        files: ['.rebooted'],
        options: {
          livereload: true
        }
      }
    }
  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks("grunt-jsbeautifier");
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-express-server');
  grunt.loadNpmTasks('grunt-keepalive');
  grunt.loadNpmTasks('grunt-nodemon');

  /**
   * User to Format all Client and Server Side Javascripts files
   */
  grunt.registerTask('format',['jsbeautifier', 'jshint']);

  /**
   * Use to run karma test, format all cient and server side javascripts files,
   */
  grunt.registerTask('default', "Starts server and client - for development", ['jsbeautifier', 'jshint', 'nodemon']);
};
