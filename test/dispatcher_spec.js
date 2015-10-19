/*eslint-env mocha */
'use strict';

var proxyquire = require('proxyquire');
var chai = require('chai');
var expect = chai.expect;
var chaiAsPromised = require('chai-as-promised');
var dispatcher = require('../lib/dispatcher').create();
var nock = require('nock');
var sinon = require('sinon');

chai.use(chaiAsPromised);

describe('dispatcher', function() {
  this.slow(200); // ms. A test is flagged as slow if longer than this much
  var long_url = 'https://test-bucket.s3.amazonaws.com/test_archive.tar.gz';
  var short_url = 'http://bit.ly/DummY12';

  describe('#getLongUrl', function() {
    it('returns a long URL', function() {
      var options = {
        bucket: 'test-bucket',
        filename: 'test_archive'
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

  describe('#writeUrlTex', function() {
    it('writes the given URL to the given file', function() {
      var spy = sinon.spy();
      var fsMock = {
        writeFile: function(file, contents, callback) {
          spy(file, contents);
          callback();
        }
      };
      var mockedDispatcher = proxyquire('../lib/dispatcher', {
        'fs-extra': fsMock
      });
      var subject = mockedDispatcher.create();

      var options = {
        output_file: '.tmp/url.tex',
        url: 'http://example.com/foo'
      };
      var tex_string = '\\url{' + options.url + '}';
      return subject.writeUrlTex(options)
        .then(function() {
          return expect(spy.calledWith(options.output_file, tex_string)).to.eq(true);
        });
    });
  });

  describe('#upload', function() {
    context('when called with valid options', function() {
      it('gets fulfilled', function() {
        var s3_host = 'https://test-bucket.s3.amazonaws.com:443';
        var s3_endpoints = {
          putObject: '/test_file.txt'
        };
        var s3_fixtures = {
          putObjects: 'test/fixtures/s3_putObject.json'
        };
        nock(s3_host)
          .put(s3_endpoints.putObject)
          .reply(200, s3_fixtures.putObject);

        var options = {
          s3_access_key: 'test_access_key',
          s3_secret_key: 'test_secret_key',
          s3_bucket: 'test-bucket',
          file: 'test/fixtures/test_file.txt'
        };
        return expect(dispatcher.upload(options)).to.be.fulfilled;
      });
    });
  });
});

