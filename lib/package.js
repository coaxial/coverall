// A package contains files (resume, letter), a recipient (company name) and has a name (recipient + md5 hash for
// resume & letter).

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
