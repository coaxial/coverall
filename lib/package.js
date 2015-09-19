// A package contains files (resume, letter), a recipient (company name) and has a name (recipient + md5 hash for
// resume & letter).

var crypto = require('crypto');
var fs = require('fs');
var _ = require('lodash');
var async = require('async');
var helpers = require('../helpers');
var Bitly = require('bitly');

module.exports = Package;

// Package takes a config argument.
// config is an object that must have a recipient (string) and files (object { file: 'path/to/file.ext' })
function Package(config) {
  if (!config || typeof(config) !== 'object') throw new TypeError("Package: Invalid or empty config object passed to constructor");

  if (!config.hasOwnProperty('recipient') || !config.hasOwnProperty('files')) throw new TypeError('Package: config.recipient or config.files missing');

  for (var name in config.files) {
    if (typeof(config.files[name]) !== 'string') {
      throw new TypeError('Package: config.files[' + name + '] is not a string ("' + config.files[name] + '"');
    }
  }

  if (config.config_files && typeof(config.config_files) !== 'object') return done(new Error('Package: config.config_files must be an object, got: ' + config.config_files));

  var self = this;
  var defaults = {
    config_files: {
      config: 'config.json',
      secrets: 'secrets.json'
    }
  };

  self.recipient = config.recipient;
  self.files = config.files;

  self.config_files = config.config_files || defaults.config_files;
  
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
    }],
    populateShortUrl: ['populateS3Url', function(next) {
      self._initShortUrl(next);
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

  async.forEachOf(self.config_files, function(file_path, file_type, done) {
    helpers.parseJson(file_path, function(err, json_object) {
      if (err) return done(err);
      self[file_type] = json_object;
      done(null);
    });
  }, function(err) {
    if (err) return done(err);
    done(null, self);
  });
};

Package.prototype._initS3Url = function() {
  var self = this;
  if(typeof(self.long_url) === 'string') return self.long_url;

  self.long_url = self._generateS3Url();
  return self.long_url;
};

Package.prototype._initShortUrl = function(done) {
  var self = this;
  if(typeof(self.short_url) === 'string') return done(null, self.short_url);

  self._generateShortUrl(function(err, short_url) {
    if (err) return done(err);
    self.short_url = short_url;
    done(null, self.short_url);
  });
}


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

Package.prototype._generateShortUrl = function(done) {
  var self = this;
  var bitly = new Bitly(self.secrets.bitly_access_token);
  bitly.shorten(self.long_url, function tagLink(err, response) {
    if (err) return done(err);
    var short_url = response.data.url;
    var link_title = self.recipient + "'s package";
    var link_note = new Date().toISOString();
    bitly.linkEdit(['title', 'note'], short_url, [link_title, link_note], function(err, response) {
      if (err) return done(err);
      done(null, short_url);
    });
  });
}
