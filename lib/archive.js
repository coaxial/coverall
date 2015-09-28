// An archive contains files (tex, pdf, js, README.md), a s3_url and a short_url. It is the tar.gz archive that will
// be downloadable by recipients.

var path = require('path');
var fs = require('fs-extra');
var async = require('async');
var clone = require('nodegit').Clone.clone;
var tar = require('tar-fs');

module.exports = Archive;

function Archive(pkg) {
  var self = this;
  var tmp_dir_name = '.tmp';
  var code_dir_name = 'code';
  var files_dir_name = 'files';
  var output_dir_name = 'archives';
  var coverall_docs_dir_name = 'coverall_documents';
  
  // the archive's name (no extension):
  self.name = pkg.name;
  self.recipient_name = pkg.recipient_name;
  self.skel_path = path.resolve('lib/archive_skel');
  // path to letter.tex:
  self.tex_letter_path = path.resolve(pkg.files.letter);
  // path to resume.tex:
  self.tex_resume_path = path.resolve(pkg.files.resume);
  // path to merged.pdf (letter.pdf + resume.pdf):
  self.pdf_package_path = path.resolve(pkg.compiled_files.package);
  // temp dir where the archive is assembled:
  self.tmp_dir = path.resolve(tmp_dir_name, pkg.name);
  // path to final archive:
  self.output_path = path.resolve(output_dir_name, self.name + '.tar.gz');
  // where to copy files to be added to the archive:
  self.files_path = path.resolve(tmp_dir_name, self.name, files_dir_name);
  // where the tex files are within the archive:
  self.coverall_docs_path = path.resolve(self.files_path, code_dir_name, coverall_docs_dir_name);
}

Archive.prototype.make = function(done) {
  var self = this;
  async.series([
      function(next) {
        self._prepareFilesDir(next);
      },
      function(next) {
        self._copyFiles(next);
      },
      function(next) {
        self._writeArchive(next);
      }
  ], done)
};

Archive.prototype.saveToCloud = function(done) {
  // upload it to s3
  // done();
};

// ********************************
// * Private functions
// ********************************

Archive.prototype._prepareFilesDir = function(done) {
  var self = this;
  fs.emptyDir(self.tmp_dir, done);
};

Archive.prototype._copyFiles = function(done) {
  var self = this;
  async.parallel([
    function copyTex(next) {
      var sources = {
        // the file is considered as a dir for path.resolve
        tex_letter_path: path.resolve(self.tex_letter_path, '..'),
        tex_resume_path: path.resolve(self.tex_resume_path, '..'),
        tex_letter_shared_path: path.resolve(self.tex_letter_path, '../../shared/')
      };
      var destinations = {
        coverletter_path: path.resolve(self.coverall_docs_path, 'coverletters', self.recipient_name.toLowerCase()),
        resume_path: path.resolve(self.coverall_docs_path, 'resume'),
        coverletter_shared_path: path.resolve(self.coverall_docs_path, 'coverletters/shared/')
      };
      var texFilter = function(filename) {
        var contains_dot = /\./gm;
        var hidden = /\/\./gm;
        var cls_or_tex_file = /\.(cls|tex)$/gm;
        var is_a_dir = !contains_dot.test(filename);
        var is_not_hidden = (contains_dot.test(filename) && !hidden.test(filename));
        var is_cls_or_tex = cls_or_tex_file.test(filename);
        // it doesn't contain a dot or it isn't a hidden file or it is a cls/tex file
        var is_allowed = is_a_dir || is_not_hidden || is_cls_or_tex;
        return is_allowed;
      };

      async.parallel([
          function copyCoverletter(step) {
            fs.copy(sources.tex_letter_path, destinations.coverletter_path, { filter: texFilter }, step);
          },
          function copyShared(step) {
            fs.copy(sources.tex_letter_shared_path, destinations.coverletter_shared_path, { filter: texFilter }, step);
          },
          function copyResume(step) {
            fs.copy(sources.tex_resume_path, destinations.resume_path, { filter: texFilter }, step);
          }
      ], next);
    },
    function copyPdf(next) {
      var sources = {
        pdf_package_path: self.pdf_package_path
      };
      var destinations = {
        pdf_package_path: path.resolve(self.files_path, 'pdf', self.recipient_name.toLowerCase() + '.pdf')
      };
      var pdf_filter = /[^\.].*\.pdf/;

      fs.copy(sources.pdf_package_path, destinations.pdf_package_path, { filter: pdf_filter }, next);
    },
    function copyJs(next) {
      var destinations = {
        coverall_repo_path: path.resolve(self.files_path, 'code/coverall')
      };
      clone('https://github.com/coaxial/coverall.git', destinations.coverall_repo_path)
        .then(function() {
          return next(null);
        })
        .catch(next);
    }
  ], done);
};

Archive.prototype._writeArchive = function(done) {
  var self = this;
  var archive_dir_path = path.resolve(self.output_path, '..');

  // fs.createWriteStream will error if the dir doesn't exist:
  fs.ensureDir(archive_dir_path);
  tar.pack(self.files_path)
    .pipe(fs.createWriteStream(self.output_path))
    .on('error', done)
    .on('finish', done);
};
