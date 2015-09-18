// A package contains files (resume, letter), a recipient (company name) and has a name (recipient + md5 hash for
// resume & letter).

var crypto = require('crypto');
var fs = require('fs');
var _ = require('lodash');
var async = require('async');
var helpers = require('../helpers');

module.exports = Package;

// Package takes a config argument.
// config is an object that must have a recipient (string) and files (object { file: 'path/to/file.ext' })
function Package(config) {
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

  self.config_file = config.config_file || 'config.json';
  
}

Package.prototype.init = function(done) {
  var self = this;
  async.auto({
    populateName: function(next) {
      self._initName(next);
    },
    populateConfig: function(next) {
      self._initConfig(next);
    },
    populateS3Url: ['populateConfig', function(next) {
      self._initS3Url();
      next();
    }]
  }, function(err, result) {
      if (err) return done(err);
      return done(null, self);
  });
};

// ***********************************
// Private functions
//
// ***********************************

Package.prototype._initName = function(done) {
  var self = this;
  if (typeof(self.name) === 'string') return done(null, self.name);

  self._generateName(function(err, name) {
    if (err) return done(err);
    self.name = name;
    return done(null, self.name);
  });
};

Package.prototype._initConfig = function(done) {
  var self = this;
  if (typeof(self.config) === 'string') return done(null, self.config);

  helpers.get_config(self.config_file, function(err, config_data) {
    if (err) return done(err);
    self.config = config_data;
    done(null, self.config);
  });
};

Package.prototype._initS3Url = function() {
  var self = this;
  if(typeof(self.long_url) === 'string') return self.long_url;

  self.long_url = self._generateS3Url();
  return self.long_url;
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

Package.prototype._generateS3Url = function() {
  var self = this;
  var protocol = 'https://';
  var aws_fqdn = '.s3.amazonaws.com/';
  var package_name = self.name;
  var archive_ext = '.tar.gz';

  return protocol + self.config.s3_bucket + aws_fqdn + package_name + archive_ext;
};


