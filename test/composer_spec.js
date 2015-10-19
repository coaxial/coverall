/*eslint-env mocha */
'use strict';

var chai = require('chai');
var expect = chai.expect;
var chaiAsPromised = require('chai-as-promised');
var sinon = require('sinon');
var proxyquire = require('proxyquire');
var composer = require('../lib/composer').create();
var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var path = require('path');

chai.use(chaiAsPromised);

describe('composer', function() {
  describe('#getName', function() {
    var options = {
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
            return Promise.resolve(result.push(name));
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
            return Promise.resolve(result.push(name));
          });
      }))
      .then(function() {
        return expect(result[0]).to.not.eq(result[1]);
      });
    });

    it("param-cases the recipient's name", function() {
      var opt = _.cloneDeep(options);
      opt.files = ['test/fixtures/coverall_documents/resume/resume.tex'];
      
      return expect(composer.getName(options)).to.eventually.match(/^test-recipient/);
    });
  });

  describe('#compile', function() {
    var spy;
    var fsMock;
    var child_processMock;
    var subject;
    var options;

    beforeEach(function() {
      spy = {};
      spy.pdflatex = sinon.spy();
      spy.gs = sinon.spy();
      fsMock  = {
        stat: function(file, cb) {
          // console.log('using mock');
          // From Date: "Integer value representing the month, beginning with 0 for January to 11 for December."
          var newer_date = new Date(2015, 9, 1);
          var older_date = new Date(1986, 6, 25);

          if (file.match(/older_tex_newer_pdf/)) {
            if (file.match(/\.tex$/)) {
              // console.log('returning an older tex');
              return cb(null, {
                mtime: older_date
              });
            }
            // console.log('returning a newer pdf');
            return cb(null, {
              mtime: newer_date
            });
          }

          if (file.match(/newer_tex_older_pdf/)) {
            if (file.match(/\.tex/)) {
              // console.log('returning a newer tex');
              return cb(null, {
                mtime: newer_date
              });
            }
            // console.log('returning an older pdf');
            return cb(null, {
              mtime: older_date
            });
          }

          if (file.match(/a_tex_no_pdf/)) {
              // console.log('for', file);
            if (file.match(/\.tex$/)) {
              // console.log('returning a tex');
              return cb(null, {
                mtime: newer_date
              });
            }
            // console.log('returning a missing pdf');
            return cb(new Error);
          }
        }
      };
      child_processMock = {
        spawn: function(cmd, opt) {
          if (cmd.match(/^gs/)) spy.gs(cmd, opt);
          if (cmd.match(/^pdflatex/)) spy.pdflatex(cmd, opt);
          var emitter = new EventEmitter();
          setTimeout(function() {
            emitter.emit('finish');
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
          coverletter: 'dummy_path/letters/company/a_tex_no_pdf.tex',
          resume: 'dummy_path/resume/a_tex_no_pdf.tex'
        },
        newer_pdfs: {
          coverletter: 'dummy_path/letters/company/older_tex_newer_pdf.tex',
          resume: 'dummy_path/resume/older_tex_newer_pdf.tex'
        },
        older_pdfs: {
          coverletter: 'dummy_path/letters/company/newer_tex_older_pdf.tex',
          resume: 'dummy_path/resume/newer_tex_older_pdf.tex'
        },
        newer_and_older: {
          coverletter: 'dummy_path/letters/company/newer_tex_older_pdf.tex',
          resume: 'dummy_path/resume/older_tex_newer_pdf.tex'
        },
        one_pdf_missing: {
          coverletter: 'dummy_path/letters/company/a_tex_no_pdf.tex',
          resume: 'dummy_path/resume/older_tex_newer_pdf.tex'
        }
      };
    });

    context('in any case', function() {
      it('merges all the documents into a single PDF', function() {
        var opt_array = [];
        _.each(Object.keys(options), function(situation) {
          opt_array.push(options[situation]);
        });

        return Promise.all(opt_array.map(function(opt) {
          return subject.compile(opt)
            .then(function gatherResults() {
              return expect(spy.gs.callCount).to.eq(5);
            });
        }));
      });

      it('calls `gs` with the right arguments', function() {
        var opt = options.missing_pdfs;
        var recipient_name = path.basename(path.resolve(path.dirname(opt.coverletter)));
        var output_pdf = path.resolve(path.dirname(opt.coverletter), recipient_name) + '.pdf';
        var coverletter_pdf = path.resolve(path.dirname(opt.coverletter), path.basename(opt.coverletter, path.extname(opt.coverletter))) + '.pdf';
        var resume_pdf = path.resolve(path.dirname(opt.resume), path.basename(opt.resume, path.extname(opt.resume))) + '.pdf';
        var expected = ['gs -dBATCH -dNOPAUSE -sDEVICE=pdfwrite -sOutputFile=' + output_pdf + ' ' + coverletter_pdf + ' ' + resume_pdf, undefined];

        return subject.compile(opt)
          .then(function() {
            return expect(spy.gs.getCall(0).args).to.eql(expected);
          });
      });
    });

    context('when all PDF files are missing', function() {
      it('generates both files', function() {
        var opt = options.missing_pdfs;

        return subject.compile(opt)
          .then(function() {
            return expect(spy.pdflatex.callCount).to.eq(2);
          });
      });

      it('calls `pdflatex` with the right arguments', function() {
        var opt = options.missing_pdfs;

        return subject.compile(opt)
          .then(function() {
            var expected_cwd = {
              coverletter: path.resolve(path.dirname(opt.coverletter)),
              resume: path.resolve(path.dirname(opt.resume))
            };
            var results = spy.pdflatex.getCall(0) && spy.pdflatex.getCall(0).args.concat(spy.pdflatex.getCall(1).args);
            var expected = ['pdflatex ' + opt.coverletter, { cwd: expected_cwd.coverletter }].concat(['pdflatex ' + opt.resume, { cwd: expected_cwd.resume }]);

            return expect(results).to.eql(expected);
          });
      });
    });

    context('when all PDF files are newer', function() {
      it('does not generates any PDF files', function() {
        var opt = options.newer_pdfs;

        return subject.compile(opt)
          .then(function() {
            return expect(spy.pdflatex.called).to.eq(false);
          });
      });
    });

    context('when all PDFs are older', function() {
      it('generates both files', function() {
        var opt = options.older_pdfs;
        return subject.compile(opt)
          .then(function() {
            return expect(spy.pdflatex.callCount).to.eq(2);
          });
      });

      it('calls pdflatex with the right arguments', function() {
        var opt = options.older_pdfs;
        var expected = [
          [
            'pdflatex ' + opt.coverletter,
            { cwd: path.resolve(path.dirname(opt.coverletter)) }
          ],
          [
            'pdflatex ' + opt.resume,
            { cwd: path.resolve(path.dirname(opt.resume)) }
          ]
        ];

        return subject.compile(opt)
          .then(function() {
            return expect(spy.pdflatex.args).to.eql(expected);
          });
      });
    });

    context('with a mix of new and old', function() {
      it('only generates one file', function() {
        var opt = options.newer_and_older;

        return subject.compile(opt)
          .then(function() {
            return expect(spy.pdflatex.callCount).to.eq(1);
          });
      });

      it('calls `pdflatex` with the right arguments', function() {
        var opt = options.newer_and_older;
        var expected = [
          [
            'pdflatex ' + opt.coverletter,
            { cwd: path.resolve(path.dirname(opt.coverletter)) }
          ]
        ];

        return subject.compile(opt)
          .then(function() {
            return expect(spy.pdflatex.args).to.eql(expected);
          });
      });
    });

    context('with one newer and one missing PDF', function() {
      it('only generates one file', function() {
        var opt = options.one_pdf_missing;

        return subject.compile(opt)
          .then(function() {
            return expect(spy.pdflatex.callCount).to.eq(1);
          });
      });

      it('calls `pdflatex` with the right arguments', function() {
        var opt = options.one_pdf_missing;
        var expected = [
          [
            'pdflatex ' + opt.coverletter,
            { cwd: path.resolve(path.dirname(opt.coverletter)) }
          ]
        ];

        return subject.compile(opt)
          .then(function() {
            return expect(spy.pdflatex.args).to.eql(expected);
          });
      });
    });
  });
});
