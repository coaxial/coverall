/*eslint-env mocha */
var Promise = require('bluebird');
var chai = require('chai');
var chaiAsPromised = require("chai-as-promised");
var expect = chai.expect;
var Archive = require('../lib/archive');
var _ = require('lodash');
var fs = Promise.promisifyAll(require('fs-extra'));
var AWS = require('aws-sdk');
var crypto = require('crypto');
var path = require('path');
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

  after(function() {
    return globAsync('archives/test*')
      .map(function(filename) {
        return fs.removeAsync(filename);
      });
  });

  describe('#upload', function() {
    it('uploads to S3', function() {
      var modified_pkg = _.cloneDeep(pkg);
      modified_pkg.name = 'test_1000000000';
      var test_archive = new Archive(modified_pkg);
      var S3Promise;
      var filename = modified_pkg.name + '.tar.gz';
      var secrets;
      var config;

      return test_archive.make()
        .then(function readJson() {
          return Promise.all([
             fs.readJsonAsync('secrets.json'),
             fs.readJsonAsync('config.json')
          ]);
        })
        .then(function uploadArchive(json_objects) {
          secrets = json_objects[0];
          config = json_objects[1];
          var options = {
            s3_access_key: secrets.s3_access_key,
            s3_secret_key: secrets.s3_secret_key,
            s3_bucket: config.s3_bucket
          };

          return test_archive.upload(options);
        })
        .then(function verifyUpload() {
          var options = {
            Bucket: config.s3_bucket,
            Key: filename
          };

          S3Promise = new Promise.promisifyAll(new AWS.S3({
            accessKeyId: secrets.s3_access_key,
            secretAccessKey: secrets.s3_secret_key
          }));

          return S3Promise.getObjectAsync(options)
        })
        .then(function hashRemoteObject(data) {
          // data.Body is a Buffer
          var shasum = crypto.createHash('sha1');
          shasum.update(data.Body);
          var remote_object_hash = shasum.digest('hex');

          return Promise.resolve(remote_object_hash);
        })
        .then(function compareHashes(remote_object_hash) {
          var shasum = crypto.createHash('sha1');

          return fs.createReadStream(path.resolve('archives', filename))
            .on('data', function(data) {
              shasum.update(data);
            })
            .on('finish', function() {
              var local_object_hash = shasum.digest('hex');

              return expect(local_object_hash).to.eq(remote_object_hash);
            });
        })
        .then(function removeRemoteObject() {
          var options = {
            Bucket: config.s3_bucket,
            Key: filename
          };

          return S3Promise.deleteObjectAsync(options);
        });
    });
  });
});
