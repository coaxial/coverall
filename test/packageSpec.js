var expect = require('chai').expect;
var Package = require('../lib/package');
var sinon = require('sinon');

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

  describe('#get_name', function() {
    var config;
    var subject;

    beforeEach(function() {
      config = {
        recipient: 'Test',
        files: {
          fileA: 'test/fixtures/fileA.test',
          fileB: 'test/fixtures/fileB.test'
        }
      };

      subject = new Package(config);
    });

    it('should return a string', function(done) {
      subject.get_name(function(err, name) {
        if (err) return done(err);
        expect(typeof(name)).to.eq('string');
        return done();
      });
    });

    it("should include the recipient's lowercase name", function(done) {
      subject.get_name(function(err, name) {
        if (err) return done(err);
        expect(name).to.match(/test/);
        return done();
      });
    });

    it('should include a 6 chars hash', function(done) {
      var hash_regex = /[a-f0-9]{6}/;
      subject.get_name(function(err, name) {
        if (err) return done(err);
        expect(name).to.match(hash_regex);
        return done();
      });
    });
  });
});
