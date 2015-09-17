var expect = require('chai').expect;
var Package = require('../lib/package');

describe('Package', function() {
  it('should create new package when passed a valid config', function() {
    var config = {
      recipient: 'Example',
      files: {
        fileA: '/path/to/filea.ext',
        fileB: 'relative/path/to/fileb.ext'
      }
    };
    var subject = new Package(config);

    expect(subject).to.deep.equal(config);
  });

  it('should throw with no config', function() {
    var subject = function() { new Package(); };

    expect(subject).to.throw(TypeError, /invalid or empty/i);
  });

  it('should throw without an object as config', function() {
    var config = 'invalid';
    var subject = function() { new Package(config); };
    
    expect(subject).to.throw(TypeError, /invalid or empty/i);
  });

  it('should throw with an incomplete config', function() {
    var config = { recipient: 'Test' };
    var subject = function() { new Package(config); };
    
    expect(subject).to.throw(Error, /missing/i);
  });

  it('should throw with a bad config.files', function() {
    var config = { recipient: 'Test', files: 'invalid' };
    var subject = function() { new Package(config); };

    expect(subject).to.throw(TypeError, /not a string/i);
  });
});
