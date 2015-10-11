'use strict';

var Promise = require('bluebird');
var Bitly = require('bitly');
var AWS = require('aws-sdk');
var fs = Promise.promisifyAll(require('fs-extra'));
var path = require('path');

var dispatcher = function() {
  return {
    /**
     * @param {Object} options
     * @param {string} options.protocol - Protocol to build the URL with, defaults to 'https://'
     * @param {string} options.bucket - S3 bucket
     * @param {string} options.fqdn - Defaults to 's3.amazonaws.com'
     * @param {string} options.filename - The file's name without its extension
     * @param {string} options.extension - The file's extension, defaults to '.tar.gz'
     * @returns {string} long_url - The file's S3 URL
     * @returns {Function} Promise - A promise resolved with the long_url as a string or rejected with an Error instance
     */
    getLongUrl: Promise.method(function getLongUrl(options) {
      var protocol = options.protocol || 'https://';
      var bucket = options.bucket;
      var fqdn = options.fqdn || 's3.amazonaws.com';
      var filename = options.filename;
      var extension = options.extension || '.tar.gz';

      return protocol + bucket + '.' + fqdn + '/' + filename + extension;
    }),
    /**
     * @param {Object} options
     * @param {string} options.bitly_access_token - Get yours from https://bitly.com/a/oauth_apps (under Generic Access
     * Token)
     * @param {string} options.long_url - The long URL to shorten
     * @param {string} options.link_title - The title to tag the link with
     * @param {string} options.link_note - The note to tag the link with, defaults `new Date().toISOString()`
     * @returns {Function} Promise - A promise resolved with the short_url as a string or rejected with an Error
     * instance
     */
    getShortUrl: Promise.method(function getShortUrl(options) {
      var bitly = new Bitly(options.bitly_access_token);
      var long_url = options.long_url;
      var link_title = options.link_title;
      var link_note = options.link_note || new Date().toISOString();

      return bitly.shorten(long_url)
        .then(function(shorten_response) {
          var short_url = shorten_response.data.url;
          var edit_fields = ['title', 'note'];
          var new_values = [link_title, link_note];
          return bitly.linkEdit(edit_fields, short_url, new_values)
            .then(function(edit_response) {
              var edited_short_url = edit_response.data.link_edit.link;
              return edited_short_url;
            });
        });
    }),
    /**
     * @param {Object} options
     * @param {string} options.s3_access_key
     * @param {string} options.s3_secret_key
     * @param {string} options.s3_bucket
     * @param {string} options.file - Path to the file to be uploaded
     * @param {string} [options.file_key] - Name to save the file under, defaults to the original file's name
     * @returns {Function} Promise - A promise resolved with `true` or rejected with an Error
     */
    upload: Promise.method(function upload(options) {
      var s3_options = {
        accessKeyId: options.s3_access_key,
        secretAccessKey: options.s3_secret_key,
        params: {
          Bucket: options.s3_bucket
        }
      };
      var file_stream = fs.createReadStream(options.file);
      var file_key = options.file_key || path.basename(options.file);
      var promisedS3 = Promise.promisifyAll(new AWS.S3(s3_options));

      return promisedS3.putObjectAsync({
        Body: file_stream,
        Key: file_key
      });
    })
  };
};

module.exports = {
  create: dispatcher
};
