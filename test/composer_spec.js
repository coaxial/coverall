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
    it('does not care about options.files order', function() {
      var test_composer = composer.create();
      var options = {
        files: ['test/fixtures/coverall_documents/coverletters/test/letter.tex', 'test/fixtures/coverall_documents/resume/resume.tex'],
        recipient_name: 'Test Recipient'
      };
      var reversed_options = _.cloneDeep(options);
      reversed_options.files = reversed_options.files.reverse();
      var test_result = [];

      return Promise.all([
          options,
          reversed_options
      ].map(function(opt) {
        return test_composer.getName(opt)
          .then(function(name) {
            test_result.push(name);
          });
      }))
      .then(function() {
        return expect(test_result[0]).to.eq(test_result[1]);
      });
    });
  });

  describe('#compile', function() {
    it('writes the shortened URL to a file', function() {
      var spy = sinon.spy(fs, 'writeFile');
      var test_composer = composer.create();

      return test_composer.compile()
        .then(expect(spy.calledWith).to.eq('url.tex', 'http://bit.ly/DummY12'));
    });
  });
});
