/*eslint-env mocha */
var expect = require('chai').expect;
var fs = require('fs');
var rewire = require('rewire');
var Package = rewire('../lib/package');
var async = require('async');
var _ = require('lodash');
var path = require('path');

describe('Package', function() {
  var valid_config = {
    recipient: 'Test',
    files: {
      letter: 'test/fixtures/fileA.test',
      resume: 'test/fixtures/fileB.test'
    },
    config_files: {
      config: 'test/fixtures/config.json',
      secrets: 'test/fixtures/secrets.json'
    }
  };
  var revert = {};
  // Don't clutter the disk during tests
  var fsMock = {
    writeFile: function(file_name, contents, cb) {
      return cb(null);
    }
  };

  var SHORT_URL = 'http://bit.ly/1V5mTM2';
  var PACKAGE_NAME = 'test_0790feebb1'

  beforeEach(function() {
    revert.fswriteFile = Package.__set__('fs.writeFile', fsMock.writeFile);
  });

  afterEach(function() {
    revert.fswriteFile();
    revert = {};
  });

  describe('Constructor', function() {
    it("doesn't throw with a valid config", function() {
      var subject = function() { new Package(valid_config); };

      expect(subject).to.not.throw();
    });

    it('creates new package when passed a valid config', function() {
      var subject = new Package(valid_config);

      expect(subject).to.have.property('recipient', valid_config.recipient);
      expect(subject).to.have.property('files', valid_config.files);
    });

    it('throws with no config', function() {
      var subject = function() { new Package(); };

      expect(subject).to.throw(TypeError, /invalid or empty/i);
    });

    it('throws without an object as config', function() {
      var config = 'invalid';
      var subject = function() { new Package(config); };
      
      expect(subject).to.throw(TypeError, /invalid or empty/i);
    });

    it("throws when config.files doesn't have letter and resume properties", function() {
      var config = _.cloneDeep(valid_config);
      config.files = {
        foo: 'test/fixtures/fileA.test',
        bar: 'test/fixtures/fileB.test'
      };
      var subject = function() { new Package(config); };

      expect(subject).to.throw(Error);
    });

    it("throws when config.files.letter isn't a string", function() {
      var config = _.cloneDeep(valid_config);
      config.files.letter = ['test/fixtures/fileA.test'];
      var subject = function() { new Package(config); };

      expect(subject).to.throw(Error);
    });

    it('throws with an incomplete config', function() {
      var incomplete_config = { recipient: 'Test' };
      var subject = function() { new Package(incomplete_config); };
      
      expect(subject).to.throw(Error, /missing/i);
    });

    it('throws with a bad config.files', function() {
      var invalid_config = { recipient: 'Test', files: 'invalid' };
      var subject = function() { new Package(invalid_config); };

      expect(subject).to.throw(TypeError);
    });
  });

  describe('#init', function() {
    var test_package;
    var revert;
    var fixture = {
      config_file_path: valid_config.config_files.config
    };

    beforeEach(function(done) {
      // Prevent writing url.tex during tests to avoid cluttering
      var fsMock = {
        writeFile: function(file_name, contents, done) {
          return done(null);
        }
      };
      revert = Package.__set__('fs.writeFile', fsMock.writeFile);

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
          test_package.init(function(err) {
            if (err) return done(err);
            next();
          });
        }
      }, function(err) {
        if (err) return done(err);
        done();
      });
    });

    afterEach(function() {
      // Remove fs.writeFile mock
      revert();
    });

    it('handles being initialized more than once', function(done) {
      test_package.init(function(err, pkg) {
        if (err) return done(err);
        expect(pkg.config).to.deep.equal(fixture.config_data);
        done();
      });
    });

    it('populates self.config', function() {
      expect(test_package.config).to.deep.equal(fixture.config_data);
    });

    it('populates self.long_url', function() {
      var long_url = 'https://test-bucket.s3.amazonaws.com/' + PACKAGE_NAME + '.tar.gz';

      expect(test_package.long_url).to.eq(long_url);
    });

    it('populates self.name', function() {
      expect(test_package.name).to.eq(PACKAGE_NAME);
    });

    it('populates self.short_url', function() {
      expect(test_package.short_url).to.eq(SHORT_URL);
    });
    
    it('writes the short URL to a LaTeX file', function(done) {
      var fsMock = {
        writeFile: function(file_name, contents, done) {
          var latex_string = '\\url{' + SHORT_URL + '}';
          expect(contents).to.eq(latex_string);
          done(null);
        }
      };

      var revert = Package.__set__('fs.writeFile', fsMock.writeFile);
      test_package.init(function(err) {
        revert();
        if (err) return done(err);
        done(null);
      });
    });
  });

  describe('self.name', function() {
    var subject;

    beforeEach(function(done) {
      subject = new Package(valid_config);
      subject.init(done);
    });

    it('is a string', function() {
      expect(typeof(subject.name)).to.eq('string');
    });

    it("contains the recipient's lowercase name", function() {
      expect(subject.name).to.match(/test/);
    });

    it('contains a 6 chars hash', function() {
      var hash_regex = /[a-f0-9]{6}/;
      expect(subject.name).to.match(hash_regex);
    });
  });

  describe('#make', function() {

    afterEach(function() {
      revert.fswriteFile();
    });

    context('with existing tex files', function() {
      var subject;

      beforeEach(function(done) {
        subject = new Package(valid_config);
        subject.init(done);
      });

      it('populates self.compiled_files', function(done) {
        var execMock = function(cmd, opt, cb) {
          // the options to exec are optional
          if (!cb) {
            cb = opt;
            opt = {};
          }
          return cb(null);
        };
        revert.exec = Package.__set__('exec', execMock);

        subject.make(function(err) {
          if (err) return done(err);
          expect(subject.compiled_files).to.deep.equal({
            letter: path.parse('test/fixtures/fileA.pdf'),
            resume: path.parse('test/fixtures/fileB.pdf'),
            package: path.parse('test/fixtures/test.pdf')
          });
          revert.exec();
          done(null);
        });
      });

      context('when artifacts are newer', function() {
        var subject;

        beforeEach(function(done) {
          var a_while_ago = new Date(1986, 7, 25, 0, 30);
          var now = new Date(Date.now());
          fsMock.stat = function(file, cb) {
            // ensures that the artifact is always newer than the code
            if (file.match(/.*\.pdf/)) return cb(null, { mtime: now });
            return cb(null, { mtime: a_while_ago });
          };
          revert.fsWriteFile = Package.__set__('fs.writeFile', fsMock.writeFile);
          revert.fsStat = Package.__set__('fs.stat', fsMock.stat);
          subject = new Package(valid_config);
          subject.init(done);
        });
        
        afterEach(function() {
          revert.fsStat();
        });

        it('does not re-generate them', function(done) {
          var exec_not_called = true; // will fail test if the mock isn't run
          var execMock = function(cmd, opt, cb) {
            // the options to exec are optional
            if (!cb) {
              cb = opt;
              opt = {};
            }
            if (cmd.match(/^pdflatex/)) exec_not_called = false;
            return cb(null);
          };
          revert.exec = Package.__set__('exec', execMock);

          subject.make(function(err) {
            revert.exec();
            if (err) return done(err);
            expect(exec_not_called).to.eq(true);
            done();
          });
        });
      });

      context('when artifacts are older', function() {
        beforeEach(function(done) {
          var a_while_ago = new Date(1986, 7, 25, 0, 30);
          var now = new Date(Date.now());
          fsMock.stat = function(file, cb) {
            // ensures the code is always newer than the artifacact
            if (file.match(/.*\.pdf/)) return cb(null, { mtime: a_while_ago });
            return cb(null, { mtime: now });
          };
          revert.fsStat = Package.__set__('fs.stat', fsMock.stat);
          subject = new Package(valid_config);
          subject.init(done);
        });

        afterEach(function() {
          revert.fsStat();
        });

        it('regenerates them', function(done) {
          var exec_called = false;
          var execMock = function(cmd, opt, cb) {
            // the options to exec are optional
            if (!cb) {
              cb = opt;
              opt = {};
            }
            if (cmd.match(/^pdflatex/)) exec_called = true;
            return cb(null);
          };
          revert.exec = Package.__set__('exec', execMock);

          subject.make(function(err) {
            revert.exec();
            if (err) return done(err);
            expect(exec_called).to.eq(true);
            done();
          });
        });
      });
    });
  });
});
