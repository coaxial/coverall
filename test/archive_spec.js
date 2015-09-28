/*eslint-env mocha */
var expect = require('chai').expect;
var rewire = require('rewire');
var Archive = rewire('../lib/archive');
var async = require('async');
var path = require('path');
var fs = require('fs-extra');
var async = require('async');
var sinon = require('sinon');

describe('Archive', function() {
  var config;
  var subject;

  beforeEach(function() {
    config = {
      name: 'test_0790feebb1',
      recipient_name: 'Test',
      files: {
        letter: '../coverall_documents/coverletters/test/letter.tex',
        resume: '../coverall_documents/resume/resume.tex'
      },
      compiled_files: {
        package: '../coverall_documents/coverletters/test/test.pdf'
      }
      // options: {
      //   archive_skel: 'test/fixtures/archive_skel'
      // }
    };

    subject = new Archive(config);
  });

  // afterEach(function cleanUp(done) {
  //   async.parallel({
  //     delTmpDir: function(next) {
  //       rimraf('test/fixtures/coverall_docs/coverletters/test/.tmp', function(err) {
  //         // It's fine if the temp dir doesn't exist anymore
  //         if (err) return next(null);
  //         next(null);
  //       });
  //     },
  //     delArchive: function(next) {
  //       fs.unlink('test/fixtures/coverall_docs/coverletters/test/test_0790feebb1.tar.gz', function(err) {
  //         // It's fine if the archive isn't there anymore
  //         if (err) return next(null);
  //         next(null);
  //       });
  //     }
  //   }, done);
  // });

  describe('#make', function() {
    it.only('creates an archive', function(done) {
      this.timeout(10000); // ms. Building the archive can take time
      subject.make(function(err) {
        if (err) return done(new Error(err));
        var archive_location = path.resolve('archives/test_0790feebb1.tar.gz'); 
        fs.stat(archive_location, function(err, file) {
          console.log('yo');
          expect(err).to.not.exist;
          expect(file).to.exist;
          done();
        });
      });
    });
  });
});
