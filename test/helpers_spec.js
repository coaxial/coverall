/*eslint-env mocha */
var expect = require('chai').expect;
var fs = require('fs');
var helpers = require('../lib/helpers');

describe('Helpers', function() {
  describe('#parseJson', function() {
    var fixture;
    var test_config_file_path;

    before(function(done) {
      test_config_file_path = 'test/fixtures/config.json';
      // Parse fixture
      fs.readFile(test_config_file_path, function(err, data) {
        if (err) return done(err);
        fixture = JSON.parse(data);
        done();
      });
    });

    it('returns the config file as a JSON object', function(done) {
      helpers.parseJson(test_config_file_path, function(err, json) {
        if (err) return done(err);
        expect(json).to.deep.equal(fixture);
        done();
      });
    });
  });
});
