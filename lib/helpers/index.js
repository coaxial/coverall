var fs = require('fs');

module.exports = {
  // Returns a parsed JSON with the contents of json_file. Default config file is `config.json`
  parseJson: function(json_file, done) {
    // json_file is optional
    if (typeof(json_file) === 'function') {
      done = json_file;
      json_file = './config.json';
    }

    fs.readFile(json_file, function(err, data) {
      var parsed_json;
      if (err) return done(err);
      try {
        parsed_json = JSON.parse(data);
      } catch(e) {
        return done(e);
      }

      return done(null, parsed_json);
    });
  }
};


