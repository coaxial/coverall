var expect = require('chai').expect;
var fs = require('fs');
var Package = require('../lib/package');
var async = require('async');

describe('Package', function() {
  var valid_config = {
    recipient: 'Test',
    files: {
      fileA: 'test/fixtures/fileA.test',
      fileB: 'test/fixtures/fileB.test'
    },
    config_files: {
      config: 'test/fixtures/config.json',
      secrets: 'test/fixtures/secrets.json'
    }
  };

  describe('#constructor', function() {
    it('should create new package when passed a valid config', function() {
      var subject = new Package(valid_config);

      expect(subject).to.have.property('recipient', valid_config.recipient);
      expect(subject).to.have.property('files', valid_config.files);
    });

    it('should throw with no config', function() {
      var subject = function() { new Package(); };

      expect(subject).to.throw(TypeError, /invalid or empty/i);
    });

    it('should throw without an object as config', function() {
      var config = 'invalid';
      var subject = function() { new Package(config); };
      
      expect(subject).to.throw(TypeError, /invalid or empty/i);
    });

    it('should throw with an incomplete config', function() {
      var config = { recipient: 'Test' };
      var subject = function() { new Package(config); };
      
      expect(subject).to.throw(Error, /missing/i);
    });

    it('should throw with a bad config.files', function() {
      var config = { recipient: 'Test', files: 'invalid' };
      var subject = function() { new Package(config); };

      expect(subject).to.throw(TypeError, /not a string/i);
    });
  });

  describe('#init', function() {
    var test_package;
    var fixture = {
      config_file_path: valid_config.config_files.config
    };
    // fixture.config_file_path = 'test/fixtures/config.json';
    // var config = {
    //   recipient: 'Test',
    //   files: {
    //     fileA: 'test/fixtures/fileA.test',
    //     fileB: 'test/fixtures/fileB.test'
    //   },
    //   config_files: {
    //     config: fixture.config_file_path
    //   }
    // };


    beforeEach(function(done) {
      async.parallel({
        loadFixture: function(next) {
          fs.readFile(fixture.config_file_path, function(err, data) {
            if (err) return done(err);
            fixture.config_data = JSON.parse(data);
            next();
          });
        },
        instantiatePkg: function(next) {
          test_package = new Package(valid_config);
          next();
        },
        initPkg: function(next) {
          test_package.init(function(err, pkg) {
            if (err) return done(err);
            next();
          });
        }
      }, function(err, result) {
        if (err) return done(err);
        done();
      });
    });

    it('should handle being initialized more than once', function() {
      test_package.init(function(err, pkg) {
        if (err) return done(err);
        expect(pkg.config).to.deep.equal(fixture.config_data);
      });
    });

    it('should populate self.config', function() {
      expect(test_package.config).to.deep.equal(fixture.config_data);
    });

    it('should populate self.long_url', function() {
      expect(test_package.long_url).to.eq('https://test-bucket.s3.amazonaws.com/test_0790fe.tar.gz');
    });

    it('should populate self.name', function() {
      expect(test_package.name).to.eq('test_0790fe');
    });

    it('should populate self.short_url', function() {
      expect(test_package.short_url).to.eq('http://bit.ly/1Kp38KC');
    });
  });

  describe('self.name', function() {
    var config;
    var subject;

    beforeEach(function(done) {
      config = {
        recipient: 'Test',
        files: {
          fileA: 'test/fixtures/fileA.test',
          fileB: 'test/fixtures/fileB.test'
        },
        config_files: {
          config: 'test/fixtures/config.json',
          secrets: 'test/fixtures/secrets.json'
        }
      };

      subject = new Package(config);
      subject.init(done);
    });

    it('should be a string', function() {
      expect(typeof(subject.name)).to.eq('string');
    });

    it("should contain the recipient's lowercase name", function() {
      expect(subject.name).to.match(/test/);
    });

    it('should contain a 6 chars hash', function() {
      var hash_regex = /[a-f0-9]{6}/;
      expect(subject.name).to.match(hash_regex);
    });
  });
});
