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
    var fsMock;
    var child_processMock;
    var spy;
    var subject;
    var options;

    beforeEach(function() {
      spy = sinon.spy();
      fsMock = {
        stat: function(file) {
          // console.log('using mock');
          var newer_date = new Date(2015, 10, 1);
          var older_date = new Date(1986, 7, 25);

          if (file.match(/older_tex_newer_pdf/)) {
            if (file.match(/\.tex$/)) {
              // console.log('returning an older tex');
              return { mtime: older_date };
            } else {
              // console.log('returning a newer pdf');
              return { mtime: newer_date };
            }
          }

          if (file.match(/newer_tex_older_pdf/)) {
            if (file.match(/\.tex/)) {
              // console.log('returning a newer tex');
              return { mtime: newer_date };
            } else {
              // console.log('returning an older pdf');
              return { mtime: older_date };
            }
          }

          if (file.match(/a_tex_no_pdf/)) {
              // console.log('for', file);
            if (file.match(/\.tex$/)) {
              // console.log('returning a tex');
              return { mtime: newer_date };
            } else {
              // console.log('returning a missing pdf');
              throw new Error;
            }
          }
        }
      };
      child_processMock = {
        spawn: function(cmd, opt) {
          spy(cmd, opt);
          var emitter = new EventEmitter();
          setTimeout(function() {
            emitter.emit('end');
          }, 0);
          return emitter;
        }
      };
      var mockedComposer = proxyquire('../lib/composer', {
        'child_process': child_processMock,
        'fs-extra': fsMock
      });
      subject = mockedComposer.create();

      options = {
        missing_pdfs: {
          coverletter: 'dummy_path/to/a_tex_no_pdf.tex',
          resume: 'dummy_path/to/another/a_tex_no_pdf.tex'
        },
        // newer_pdfs: {
        //   coverletter: 'dummy_path/to/older_tex_newer_pdf.tex',
        //   resume: 'dummy_path/to/another/older_tex_newer_pdf.tex'
        // },
        // older_pdfs: {
        //   coverletter: 'dummy_path/to/newer_tex_older_pdf.tex',
        //   resume: 'dummy_path/to/another/newer_tex_older_pdf.tex'
        // },
        // newer_and_older: {
        //   coverletter: 'dummy_path/to/newer_tex_older_pdf.tex',
        //   resume: 'dummy_path/to/older_tex_newer_pdf.tex'
        // },
        // one_pdf_missing: {
        //   coverletter: 'dummy_path/to/a_tex_no_pdf.tex',
        //   resume: 'dummy_path/to/older_tex_newer_pdf.tex'
        // }
      };
    });

    context('in any case', function() {
      it('merges all the documents into a single PDF', function() {
        var opt_array = [
          options.missing_pdfs,
          // options.newer_pdfs,
          // options.older_pdfs,
          // options.newer_and_older,
          // options.one_pdf_missing
        ];
        var index_to_situation = [
          'missing_pdfs',
          'newer_pdfs',
          'older_pdfs',
          'newer_and_older',
          'one_pdf_missing'
        ];
        var result = {};
        var expected = {};
        return Promise.all(_.forEach(opt_array, function gatherResults(opt, index) {
          return subject.compile(opt)
            .then(function() {
              var outfile = path.resolve(path.dirname(opt.coverletter, path.basename(path.dirname(options.coverletter)))) + '.pdf';
              var coverletter_pdf = path.resolve(opt.coverletter, '../letter.pdf')
              var resume_pdf = path.resolve(opt.resume, '../resume.pdf');

              var situation = index_to_situation[index];
              result[situation] = spy.getCall(2) && spy.getCall(2).args;
              expected[situation] = ['gs -dBATCH -dNOPAUSE -sDEVICE=pdfwrite -sOutputFile=' + outfile + ' ' + coverletter_pdf + ' ' + resume_pdf, undefined];
              return Promise.resolve();
            });
        }))
          .then(function() {
            return expect(result).to.deep.equal(expected);
          });
      });
    });

//         return subject.compile(options)
//           .then(function() {
//             var out_file = path.resolve(options.coverletter, '..', path.basename(path.resolve(options.coverletter, '..'))) + '.pdf';
//             var coverletter_pdf = path.resolve(options.coverletter, '../letter.pdf');
//             var resume_pdf = path.resolve(options.resume, '../resume.pdf');
//             var expected = ['gs -dBATCH -dNOPAUSE -sDEVICE=pdfwrite -sOutputFile=' + out_file + ' ' + coverletter_pdf + ' ' + resume_pdf, undefined];
// 
//             return expect(spy.getCall(2).args).to.eql(expected);
//           });
//       });
    context('when all PDF files are missing', function() {
      it('generates the missing PDF files', function() {
        console.log('\n\n\n\n\n**********************\n');
        console.log('before test', JSON.stringify(spy.args, null, 4));
        var opt = options.missing_pdfs;
        return subject.compile(opt)
          .then(function() {
            var expected_cwd = {
              coverletter: path.resolve(path.dirname(opt.coverletter)),
              resume: path.resolve(path.dirname(opt.resume))
            };
            var results = spy.getCall(0).args.concat(spy.getCall(1).args);
            var expected = ['pdflatex ' + opt.coverletter, { cwd: expected_cwd.coverletter }].concat(['pdflatex ' + opt.resume, { cwd: expected_cwd.resume }]);
            console.log('test results:', JSON.stringify(spy.args, null, 4));
            return expect(results).to.eql(expected);
          });
      });
    });
  });
});
