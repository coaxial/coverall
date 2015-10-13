/*eslint-env mocha */
'use strict';

var chai = require('chai');
var expect = chai.expect;
var chaiAsPromised = require('chai-as-promised');
var sinon = require('sinon');
var proxyquire = require('proxyquire');
var composer = require('../lib/composer').create();
var fs = require('fs-extra');
var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var path = require('path');

chai.use(chaiAsPromised);

describe('composer', function() {
  describe('#getName', function() {
    var options = {
      // files: ['test/fixtures/coverall_documents/coverletters/test/letter.tex', 'test/fixtures/coverall_documents/resume/resume.tex'],
      files: ['test/fixtures/coverall_documents/coverletters/test/letter.tex', 'test/fixtures/coverall_documents/resume/resume.tex'],
      recipient_name: 'Test Recipient'
    };

    it('does not care about options.files order', function() {
      var reversed_options = _.cloneDeep(options);
      reversed_options.files = reversed_options.files.reverse();
      var result = [];

      return Promise.all([
          options,
          reversed_options
      ].map(function(opt) {
        return composer.getName(opt)
          .then(function(name) {
            result.push(name);
          });
      }))
      .then(function() {
        return expect(result[0]).to.eq(result[1]);
      });
    });
    
    it('returns a different hash for every fileset', function() {
      var opt_other_fileset = _.cloneDeep(options);
      opt_other_fileset.files = ['test/fixtures/coverall_documents/resume/resume.tex'];
      var result = [];

      return Promise.all([
          options,
          opt_other_fileset
      ].map(function(opt) {
        return composer.getName(opt)
          .then(function(name) {
            return result.push(name);
          });
      }))
      .then(function() {
        return expect(result[0]).to.not.eq(result[1]);
      });
    });

    it('param-cases the recipient\'s name', function() {
      var opt = _.cloneDeep(options);
      opt.files = ['test/fixtures/coverall_documents/resume/resume.tex'];
      
      return expect(composer.getName(options)).to.eventually.match(/^test-recipient/);
    });
  });

  describe('#compile', function() {
    var spy;
    var child_processMock;
    var subject;
    var options;

    beforeEach(function() {
      spy = sinon.spy();
      child_processMock = {
        spawn: function(cmd, opt) {
          spy(cmd, opt);
          var emitter = new EventEmitter();
          setTimeout(function() {
            emitter.emit('finish');
          }, 0);
          return emitter;
        }
      };
      var mockedComposer = proxyquire('../lib/composer', {
        'child_process': child_processMock
      });
      subject = mockedComposer.create();
      options = {
        coverletter: 'test/fixtures/coverall_documents/coverletters/test/letter.tex',
        resume: 'test/fixtures/coverall_documents/resume/resume.tex'
      };
    });

    it('calls pdflatex for every TeX file', function() {
      return subject.compile(options)
        .then(function() {
          var expected_cwd = {
            coverletter: path.resolve(options.coverletter, '..'),
            resume: path.resolve(options.resume, '..')
          };
          debugger;
          var results = spy.getCall(0).args.concat(spy.getCall(1).args);
          var expected = ['pdflatex ' + options.coverletter, { cwd: expected_cwd.coverletter }].concat(['pdflatex ' + options.resume, { cwd: expected_cwd.resume }]);
          return expect(results).to.eql(expected);
        });
    });

    it('merges all the documents into a single PDF', function() {
      return subject.compile(options)
        .then(function() {
          var out_file = path.resolve(options.coverletter, '..', path.basename(path.resolve(options.coverletter, '..'))) + '.pdf';
          var coverletter_pdf = path.resolve(options.coverletter, '../letter.pdf');
          var resume_pdf = path.resolve(options.resume, '../resume.pdf');
          var expected = ['gs -dBATCH -dNOPAUSE -sDEVICE=pdfwrite -sOutputFile=' + out_file + ' ' + coverletter_pdf + ' ' + resume_pdf, undefined];

          return expect(spy.getCall(2).args).to.eql(expected);
        });
    });
  });
});
