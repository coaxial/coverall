'use strict';

var chai = require('chai');
var expect = chai.expect;
var chaiAsPromised = require('chai-as-promised');
var dispatcher = require('../lib/dispatcher');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs-extra'));
var nock = Promise.promisifyAll(require('nock'));

chai.use(chaiAsPromised);

describe('dispatcher', function() {
  const long_url = 'https://test-bucket.s3.amazonaws.com/test_archive.tar.gz';
  const short_url = 'http://bit.ly/1V5mTM2';

  describe('#getLongUrl', function() {
    it('returns a long URL', function() {
      var options = {
        bucket: 'test-bucket',
        basename: 'test_archive'
      };
      var expected = long_url;

      return dispatcher.getLongUrl(options)
        .then(function(long_url) { expect(long_url).to.eq(expected); });
    });
  });

  describe('#getShortUrl', function() {
    it('returns a shortened URL', function() {
        var bitly_host = 'https://api-ssl.bitly.com:443';
        var bitly_endpoints = {
          shorten: '/v3/shorten',
          link_edit: '/v3/user/link_edit'
        };
        var bitly_fixtures = {
          shorten: 'test/fixtures/bitly_com_shorten.json',
          link_edit: 'test/fixtures/bitly_com_link_edit.json'
        };

        nock(bitly_host)
          .persist()
          .get(bitly_endpoints.shorten)
          .query(true)
          .replyWithFile(200, bitly_fixtures.shorten)
          .get(bitly_endpoints.link_edit)
          .query(true)
          .replyWithFile(200, bitly_fixtures.link_edit);

        var options = {
          bitly_access_token: 'test-token',
          long_url: long_url
        };
        var expected = short_url;

        return dispatcher.getShortUrl(options)
          .then(function(short_url) { expect(short_url).to.eq(expected); });
    });
  });
});

