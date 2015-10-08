/*eslint-env mocha */
var chai = require('chai');
var chaiAsPromised = require("chai-as-promised");
var expect = chai.expect;
var Promise = require('bluebird');
var Archive = require('../lib/archive');
var path = require('path');
var fs = Promise.promisifyAll(require('fs-extra'));
var tar = require('tar-fs');
var zlib = Promise.promisifyAll(require('zlib'));
var _ = require('lodash');
var globAsync = Promise.promisify(require('glob'));

chai.use(chaiAsPromised);

describe('Archive', function() {
  var pkg;

  beforeEach(function() {
    pkg = {
      name: 'test_0790feebb1',
      recipient_name: 'Test',
      files: {
        letter: '../coverall_documents/coverletters/test/letter.tex',
        resume: '../coverall_documents/resume/resume.tex'
      },
      compiled_files: {
        package: '../coverall_documents/coverletters/test/test.pdf'
      },
      long_url: 'https://example-bucket.s3.amazonaws.com/test_0790feebb1.tar.gz'
    };
  });

  describe('#make', function() {
    after(function() {
      return Promise.all([
          'archives/test*',
          'test/.tmp'
      ].map(function(glob_pattern) {
        return globAsync(glob_pattern)
          .each(function(filename) {
            // make every file writeable so the git packfiles can be removed
            return fs.chmodAsync(filename, '755')
              .then(function() { return fs.removeAsync(filename); });
          })
      }));
    });

    it('creates an archive', function() {
      var modified_pkg = _.cloneDeep(pkg);
      modified_pkg.name = 'test_0000000001';
      var archive_location = path.resolve('archives', modified_pkg.name + '.tar.gz');
      var test_archive = new Archive(modified_pkg);

      return test_archive.make()
        .then(function() { return fs.statAsync(archive_location); })
        .then(function(file) { return expect(file).to.exist; });
    });

    it('creates a gzip compressed archive', function() {
      var modified_pkg = _.cloneDeep(pkg);
      modified_pkg.name = 'test_0000000002';
      var archive_location = path.resolve('archives', modified_pkg.name + '.tar.gz');
      var test_archive = new Archive(modified_pkg);

      // inspired from https://github.com/mafintosh/gunzip-maybe/blob/master/index.js#L6-L11
      var isGzipped = function(data) {
        var GZIP_MAGIC_BYTES = [0x1f, 0x8b];
        var DEFLATE_COMPRESSION_METHOD = 0x08;
        var buffer = data[1];

        if (buffer[0] !== GZIP_MAGIC_BYTES[0] && buffer[1] !== GZIP_MAGIC_BYTES[1]) return false;
        if (buffer[2] !== DEFLATE_COMPRESSION_METHOD) return false;
        return true;
      };

      return test_archive.make()
        .then(function() { return fs.openAsync(archive_location, 'r'); })
        .then(function(fd) { 
          var buffer = new Buffer(10);
          var buffer_offset = 0;
          var buffer_length = 10;
          var file_position = 0;
          return fs.readAsync(fd, buffer, buffer_offset, buffer_length, file_position);
        })
        .then(function(data) { return expect(isGzipped(data)).to.be.true; })
    });

    it('has the correct directory structure', function() {
      var modified_pkg = _.cloneDeep(pkg);
      modified_pkg.name = 'test_0000000003';
      var archive_location = path.resolve('archives', modified_pkg.name + '.tar.gz');
      var test_archive = new Archive(modified_pkg);
      var tmp_extract_path = path.resolve('test/.tmp', modified_pkg.name);

      var tarPromise = function(archive_path) {
        return new Promise(function(resolve, reject) {
          fs.createReadStream(archive_path)
            .pipe(zlib.Unzip())
            .pipe(tar.extract(tmp_extract_path))
            .on('error', reject)
            .on('finish', resolve);
        })
      };

      var verifyDir = function() {
        return Promise.all([
            'code',
            'pdf',
            'code/coverall',
            'code/coverall_documents',
            'code/coverall_documents/coverletters',
            'code/coverall_documents/coverletters/test',
            'code/coverall_documents/coverletters/shared',
            'code/coverall_documents/resume',
            'code/coverall_documents/coverletters'
        ].map(function(subpath) {
          return expect(fs.statAsync(path.resolve(tmp_extract_path, subpath)))
            .to.be.fulfilled;
        }))
      };

      return test_archive.make()
        .then(function() { return tarPromise(archive_location); })
        .then(function() { return verifyDir(); })
        .then(function() { return fs.removeAsync(tmp_extract_path); });
    });

    it('removes the temporary dir', function() {
      var modified_pkg = _.cloneDeep(pkg);
      modified_pkg.name = 'test_0000000004';
      var test_archive = new Archive(modified_pkg);
      var tmp_dir = path.resolve('.tmp', modified_pkg.name);

      return test_archive.make()
        .then(function() { return expect(fs.statAsync(tmp_dir)).to.be.rejected; });
    });
  });
});
