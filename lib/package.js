// A package contains files (resume, letter), a recipient (company name) and has a name (recipient + md5 hash for
// resume & letter).

var crypto = require('crypto');
var fs = require('fs');
var _ = require('lodash');
var async = require('async');

module.exports = Package;

// Package takes a config argument.
// config is an object that must have a recipient (string) and files (object { file: 'path/to/file.ext' })
function Package(config) {
  // TODO: linter doesnt seem to work
  var self = this;

  if (!config || typeof(config) !== 'object') throw new TypeError("Package: Invalid or empty config object passed to constructor");

  if (!config.hasOwnProperty('recipient') || !config.hasOwnProperty('files')) throw new TypeError('Package: config.recipient or config.files missing');

  for (var name in config.files) {
    if (typeof(config.files[name]) !== 'string') {
      throw new TypeError('Package: config.files[' + name + '] is not a string ("' + config.files[name] + '"');
    }
  }

  self.recipient = config.recipient;
  self.files = config.files;
}

Package.prototype.get_name = function(done) {
  var self = this;
  if (typeof(self.name) === 'string') return self.name;

  self._generateName(function(err, name) {
    if (err) return done(err);
    self.name = name;
    return done(null, self.name);
  });
};

// Iterates over the files object and returns the combined hash for those files
Package.prototype._generateHash = function(files, done) {
  var self = this;
  var shasum = crypto.createHash('sha1');

  async.forEachOf(files, function(file_path, file_name, callback) {
    var stream = fs.createReadStream(file_path);
    stream.on('data', function(data) {
      shasum.update(data);
    });
    stream.on('end', function() {
      callback();
    });
  }, function returnHash(err) {
    if (err) return done(err);
    return done(null, shasum.digest('hex'));
  });
};

Package.prototype._generateName = function(done) {
  var self = this;

  self._generateHash(self.files, function(err, hash) {
    if (err) return done(new Error('Package: Error when generating hash: ' + err));
    var package_name = self.recipient.toLowerCase() + '_' + hash.substr(0, 6);
    return done(null, package_name);
  });
};
