'use strict';

var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs-extra'));
var path = require('path');
var changeCase = require('change-case');
var crypto = require('crypto');

var composer = function() {
  // Private functions
  var generateHash = function generateHash(files) {
    var shasum = crypto.createHash('sha1');
    return Promise.all(
        files.map(function(file) {
          var stream = fs.createReadStream(file);
          stream.on('data', function(data) {
            shasum.update(data);
          });
        })
    )
      .then(function() {
        var result = shasum.digest('hex');
        return result;
      });
  };
      
  // Public methods
  return {
    /**
     * @param {Object} options
     * @param {Array} options.files - Paths to the files on which to base the hash calculation
     * @param {string} options.recipient_name - The package recipient's name. Comverted to param-case and used to
     * compose the first part of the name
     * @returns {Function} Promise - Fulfilled with the package's name as a string or rejected with an Error
     */
    getName: function(options) {
     var files = options.files;
     var prefix = changeCase.paramCase(options.recipient_name);
     return generateHash(files)
       .then(function(hash) {
         return prefix + '_' + hash.substr(0, 10);
       });
    }

    // /**
    //  * @param {Object} options
    //  * @param {string} options.coverletter - Path to the directory containing the coverletter's tex file
    //  * @param {string} [options.coverletter_shared] - Path to the directory containing the coverletter's shared
    //  * elements. Defaults to `path.resolve(options.coverletter, '../shared')`
    //  * @param {string} options.resume - Path to the directory containing the resume's tex file
    //  * @returns {Function} Promise - A promise resolved with the resulting pdf document's path as a string or rejected
    //  * with an Error
    //  */
    // compile: Promise.method(function(options) {
    //   var coverletter = options.coverletter;
    //   var coverletter_shared = options.coverletter_shared || path.resolve(options.coverletter, '../shared');
    //   var resume = options.resume;
  };
};

module.exports = {
  create: composer
};
