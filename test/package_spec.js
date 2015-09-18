var expect = require('chai').expect;
var fs = require('fs');
var Package = require('../lib/package');
var async = require('async');

describe('Package', function() {
  describe('#constructor', function() {
    it('should create new package when passed a valid config', function() {
      var config = {
        recipient: 'Example',
        files: {
          fileA: 'test/fixtures/fileA.test',
          fileB: 'test/fixtures/fileB.test'
        }
      };
      var subject = new Package(config);

      expect(subject).to.have.property('recipient', config.recipient);
      expect(subject).to.have.property('files', config.files);
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
    var fixture = {};
    fixture.file_path = 'test/fixtures/config.json';
    var config = {
      recipient: 'Test',
      files: {
        fileA: 'test/fixtures/fileA.test',
        fileB: 'test/fixtures/fileB.test'
      },
      config_file: fixture.file_path
    };


    beforeEach(function(done) {
      async.parallel({
        loadFixture: function(next) {
          fs.readFile(fixture.file_path, function(err, data) {
            if (err) return done(err);
            fixture.data = JSON.parse(data);
            next();
          });
        },
        instantiatePkg: function(next) {
          test_package = new Package(config);
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

    it("shouldn't explode if initialized more than once", function() {
      test_package.init(function(err, pkg) {
        if (err) return done(err);
        expect(pkg.config).to.deep.equal(fixture.data);
      });
    });

    it('should populate self.config', function() {
      expect(test_package.config).to.deep.equal(fixture.data);
    });

    it('should populate self.long_url', function() {
      expect(test_package.long_url).to.eq('https://test-bucket.s3.amazonaws.com/test_0790fe.tar.gz');
    });

    it('should populate self.name', function() {
      expect(test_package.name).to.eq('test_0790fe');
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
