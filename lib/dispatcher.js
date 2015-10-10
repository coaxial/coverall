'use strict';

var Promise = require('bluebird');
var Bitly = require('bitly');

var dispatcher = {
  /**
   * @param {Object} options
   * @param {string} options.protocol - Protocol to build the URL with, defaults to 'https://'
   * @param {string} options.bucket - S3 bucket
   * @param {string} options.fqdn - Defaults to 's3.amazonaws.com'
   * @param {string} options.basename - The file's basename (i.e. for 'archive.tar.gz', the basename will be 'archive'
   * @param {string} options.extension - The file's extension, defaults to '.tar.gz'
   * @returns {string} long_url - The file's S3 URL
   * @returns {Function} Promise - A promise resolved with the long_url as a string or rejected with an Error instance
   */
  getLongUrl: Promise.method(function getLongUrl(options) {
    var protocol = options.protocol || 'https://';
    var bucket = options.bucket;
    var fqdn = options.fqdn || 's3.amazonaws.com';
    var basename = options.basename;
    var extension = options.extension || '.tar.gz';

    return protocol + bucket + '.' + fqdn + '/' + basename + extension;
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

    return bitly.shorten(options.long_url)
      .then(function(shorten_response) {
        var short_url = shorten_response.data.url;
        var edit_fields = ['title', 'note'];
        var new_values = [link_title, link_note];
        return bitly.linkEdit(edit_fields, short_url, new_values)
          .then(function(edit_response) {
            var edited_short_url = edit_response.data.link_edit.link;
            return edited_short_url; });
      });
  })
};

module.exports = {
  getLongUrl: dispatcher.getLongUrl,
  getShortUrl: dispatcher.getShortUrl
};
