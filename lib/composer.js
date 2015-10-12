'use strict';

var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs-extra'));
var changeCase = require('change-case');
var crypto = require('crypto');

var composer = function() {
  // Private functions
  var generateHash = function generateHash(files) {
    var shasum = crypto.createHash('sha1');
    var ordered_files = files.sort();
    return Promise.all(
        ordered_files.map(function(file) {
          return new Promise(function(resolve, reject) {
            var stream = fs.createReadStream(file);
            stream.on('data', function(data) {
              shasum.update(data);
            });
            stream.on('end', function() {
              return resolve();
            });
            stream.on('error', function(e) {
              return reject(e);
            });
          });
        }))
      .then(function() {
        return shasum.digest('hex');
      })
  };

  var writeUrlTex = function writeUrlTex(options) {
    var output_file = options.output_file;
    var url = options.url;
    var contents = '\\url{' + url + '}';

    return fs.writeFileAsync(output_file, contents);
  };
      
  // Public methods
  return {
    getName:
      /**
       * @param {Object} options
       * @param {Array} options.files - Paths to the files on which to base the hash calculation
       * @param {string} options.recipient_name - The package recipient's name. Comverted to param-case and used to
       * compose the first part of the name
       * @returns {Function} Promise - Fulfilled with the package's name as a string or rejected with an Error
       */
      function getName(options) {
        var files = options.files;
        var prefix = changeCase.paramCase(options.recipient_name);
        return generateHash(files)
          .then(function(hash) {
            return prefix + '_' + hash.substr(0, 10);
          });
      },

    compile:
      /**
       * @param {Object} options
       * @param {string} options.coverletter - Path to the directory containing the coverletter's tex file
       * @param {string} [options.coverletter_shared] - Path to the directory containing the coverletter's shared
       * elements. Defaults to `path.resolve(options.coverletter, '../shared')`
       * @param {string} options.resume - Path to the directory containing the resume's tex file
       * @returns {Function} Promise - A promise resolved with the resulting pdf document's path as a string or rejected
       * with an Error
       */
      Promise.method(function(options) {
        var coverletter = options.coverletter;
        var coverletter_shared = options.coverletter_shared || path.resolve(options.coverletter, '../shared');
        var resume = options.resume;

      };
};

module.exports = {
  create: composer
};
