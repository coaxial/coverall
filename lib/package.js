// A package represents what is sent in the mail. It contains a letter and a resume, and provides its name, short_url
// and long_url.
var crypto = require('crypto');
var fs = require('fs');
var async = require('async');
var helpers = require('./helpers');
var Bitly = require('bitly');
var path = require('path');
var exec = require('child_process').exec;
var changeCase = require('change-case');

module.exports = Package;

function Package(config) {
  if (!config || typeof(config) !== 'object') throw new TypeError("Package: Invalid or empty config object passed to constructor");

  if (!config.hasOwnProperty('recipient') || !config.hasOwnProperty('files')) throw new TypeError('Package: config.recipient or config.files missing');

  if (typeof(config.config_files) !== 'object') {
    throw new TypeError('Package: config.config_files must be an object, got: ' + config.config_files);
  }

  if (!config.files.hasOwnProperty('letter') || !config.files.hasOwnProperty('resume')) {
    throw new Error('Package: config.files must have `letter` and `resume` properties (got: ' + JSON.stringify(config.files, null, 4) + ')');
  }

  for (var name in config.files) {
    if (typeof(config.files[name]) !== 'string') {
      throw new TypeError('Package: config.files[' + name + '] is not a string ("' + config.files[name] + '"');
    }
  }

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

// The init method should be called just after Package is intantiated. It runs the asynchronous code needed to
// populate various Package's properties.
// This avoids putting the async code in the constructor, saving us from a messy instantiation
Package.prototype.init = function(done) {
  var self = this;
  async.auto({
    populateName: function(next) {
      self._initName(next);
    },
    populateConfig: function(next) {
      self._initConfig(next);
    },
    populateLongUrl: ['populateConfig', function(next) {
      self._initLongUrl();
      next();
    }],
    populateShortUrl: ['populateLongUrl', function(next) {
      self._initShortUrl(next);
    }],
    writeShortUrl: ['populateShortUrl', function(next) {
      self._writeShortUrl(next);
    }]
  }, function(err) {
      if (err) return done(err);
      return done(null, self);
  });
};

Package.prototype.compile = function(done) {
  var self = this;
  self._compileTexToPdf(done);
};

// TODO: merge compile into make

Package.prototype.make = function(done) {
  var self = this;
  async.series([
      function compileTex(next) {
        self._compileTexToPdf(next)
      },
      function mergePdf(next) {
        self._mergePdf(next);
      }
  ], done);
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

Package.prototype._initLongUrl = function() {
  var self = this;
  // Handle multiple init calls
  if(typeof(self.long_url) === 'string') return self.long_url;

  self.long_url = self._generateLongUrl();
  return self.long_url;
};

Package.prototype._initShortUrl = function(done) {
  var self = this;
  // Handle multiple init calls
  if(typeof(self.short_url) === 'string') return done(null, self.short_url);

  self._generateShortUrl(function(err, short_url) {
    if (err) return done(err);
    self.short_url = short_url;
    done(null, self.short_url);
  });
};


Package.prototype._generateHash = function(files, done) {
  var shasum = crypto.createHash('sha1');
  // objects don't guarantee enumeration order, the order in which files are sent to the hash stream can change the
  // resulting hash so we will use alphabetical order
  var sorted_file_names = Object.keys(files).sort();

  async.each(sorted_file_names, function(file_name, next) {
    var stream = fs.createReadStream(files[file_name]);
    stream.on('data', function(data) {
      shasum.update(data);
    });
    stream.on('end', function() {
      next();
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
    var package_name = self.recipient.toLowerCase() + '_' + hash.substr(0, 10);
    return done(null, package_name);
  });
};

Package.prototype._generateLongUrl = function() {
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
    // Helps tracking which link was sent where and when
    bitly.linkEdit(['title', 'note'], short_url, [link_title, link_note], function(err) {
      if (err) return done(err);
      done(null, short_url);
    });
  });
};

Package.prototype._writeShortUrl = function(done) {
  var self = this;
  var letter_path = path.parse(self.files.letter);
  var url_file = letter_path.dir + path.sep + 'url.tex';

  self._writeUrlToTex(url_file, self.short_url, done);
};

Package.prototype._writeUrlToTex = function(url_file, url, done) {
  var file_contents = '\\url{' + url + '}';

  fs.writeFile(url_file, file_contents, function(err) {
    if (err) return done(err);
    done(null, url_file);
  });
};

// Checks if files.code is more recent than files.artifact (using mtime). If so, return false. If artifact doesn't
// exist, returns false. Returns true if files.artifact is newer than files.code
Package.prototype._isArtifactFresh = function(files, done) {
  if (!files.hasOwnProperty('code') || !files.hasOwnProperty('artifact')) throw new TypeError('Package: missing argument, expected files.code and files.artifact, got: ' + JSON.stringify(files, null, 4));

  fs.stat(files.code, function(err, code_stats) {
    // missing files.code shouldn't happen
    if (err) return done(err);
    fs.stat(files.artifact, function(err, artifact_stats) {
      // missing artifact is ok, it means it has to be created from files.code but it's not an exception
      if (err) return done(null, false);
      var code_mtime = code_stats.mtime.getTime(); // in ms
      var artifact_mtime = artifact_stats.mtime.getTime(); // in ms
      // if code was modified before artifact
      if (code_mtime < artifact_mtime) return done(null, true);
      done(null, false);
    });
  });
};

Package.prototype._compileTexToPdf = function(done) {
  var self = this;
  async.forEachOf(self.files, function compile(tex_path, filename, next) {
    var parsed_tex_path = path.parse(tex_path);
    var pdf_output_path = parsed_tex_path.dir + '/' + parsed_tex_path.name + '.pdf';
    var files = {
      code: tex_path,
      artifact: pdf_output_path
    };

    // avoids unnecessary compilation if pdf files exist and latex code wasn't changed
    self._isArtifactFresh(files, function(err, isFresh) {
      if (err) return next(err);
      if (typeof(self.compiled_files) === 'undefined' && !self.compiled_files) self.compiled_files = {};
      self.compiled_files[filename] = path.parse(pdf_output_path);
      if (!isFresh) {
        // setting the cwd avoids pdflatex erroring when using custom latex documentclass files and puts the compiled pdf
        // file next to the tex file.
        var options = { cwd: parsed_tex_path.dir };
        var command = 'pdflatex ' + tex_path;
        exec(command, options, function(err) {
          if (err) return next(err);
          return next(null);
        });
      } else {
        return next(null);
      }
    });
  }, function(err) {
    if (err) return done(err);
    done(null);
  });
};

Package.prototype._mergePdf = function(done) {
  var self = this;
  // use path.resolve to get absolute paths to pass to `gs`
  var output_filename = path.resolve(self.compiled_files.letter.dir) + changeCase.snakeCase(self.recipient) + '.pdf';
  var command = 'gs -dBATCH -dNOPAUSE -sDEVICE=pdfwrite -sOutputFile=' + output_filename + ' ' + path.resolve(self.compiled_files.letter) + ' ' + path.resolve(self.compiled_files.resume);
  
  exec(command, function(err) {
    if (err) return done(err);
    self.compiled_files.package = output_filename;
  });
};
