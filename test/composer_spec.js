/*eslint-env mocha */
'use strict';

var chai = require('chai');
var expect = chai.expect;
var chaiAsPromised = require('chai-as-promised');
var sinon = require('sinon');
var rewire = require('rewire');
var composer = rewire('../lib/composer');
var fs = require('fs-extra');
var _ = require('lodash');

chai.use(chaiAsPromised);

describe('composer', function() {
  describe('#getName', function() {
    var options = {
      // files: ['test/fixtures/coverall_documents/coverletters/test/letter.tex', 'test/fixtures/coverall_documents/resume/resume.tex'],
      files: ['test/fixtures/coverall_documents/coverletters/test/letter.tex', 'test/fixtures/coverall_documents/resume/resume.tex'],
      recipient_name: 'Test Recipient'
    };

    it('does not care about options.files order', function() {
      var test_composer = composer.create();
      var reversed_options = _.cloneDeep(options);
      reversed_options.files = reversed_options.files.reverse();
      var result = [];

      return Promise.all([
          options,
          reversed_options
      ].map(function(opt) {
        return test_composer.getName(opt)
          .then(function(name) {
            result.push(name);
          });
      }))
      .then(function() {
        return expect(result[0]).to.eq(result[1]);
      });
    });
    
    it('returns a different hash for every fileset', function() {
      var test_composer = composer.create();
      var opt_other_fileset = _.cloneDeep(options);
      opt_other_fileset.files = ['test/fixtures/coverall_documents/resume/resume.tex'];
      var result = [];

      return Promise.all([
          options,
          opt_other_fileset
      ].map(function(opt) {
        return test_composer.getName(opt)
          .then(function(name) {
            return result.push(name);
          });
      }))
      .then(function() {
        return expect(result[0]).to.not.eq(result[1]);
      });
    });

    it('param-cases the recipient\'s name', function() {
      var test_composer = composer.create();
      var opt = _.cloneDeep(options);
      opt.files = ['test/fixtures/coverall_documents/resume/resume.tex'];
      
      return expect(test_composer.getName(options)).to.eventually.match(/^test-recipient/);
    });
  });

  describe('#compile', function() {
    it('writes the shortened URL to a file', function() {
      var spy = sinon.spy(fs, 'writeFile');
      var test_composer = composer.create();

      return test_composer.compile()
        .then(function() {
          return expect(spy.calledWith).to.eq('url.tex', 'http://bit.ly/DummY12')
        })
        .then(function() {
          return fs.writeFile.restore();
        });
    });
  });
});
