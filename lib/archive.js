// An archive contains files (tex, pdf, js, README.md), a s3_url and a short_url. It is the tar.gz archive that will
// be downloadable by recipients.

var Promise = require('bluebird');
var path = require('path');
var fs = Promise.promisifyAll(require('fs-extra'));
var clone = require('nodegit').Clone.clone;
var tar = require('tar-fs');
var zlib = require('zlib');
var globAsync = Promise.promisify(require('glob'));

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
  // path to letter.tex:
  self.tex_letter_path = path.resolve(pkg.files.letter);
  // path to resume.tex:
  self.tex_resume_path = path.resolve(pkg.files.resume);
  // path to merged.pdf (letter.pdf + resume.pdf):
  self.pdf_package_path = path.resolve(pkg.compiled_files.package);
  // temp dir where the archive is assembled:
  self.tmp_path = path.resolve(tmp_dir_name, pkg.name);
  // path to final archive:
  self.output_path = path.resolve(output_dir_name, self.name + '.tar.gz');
  // where to copy files to be added to the archive:
  self.files_path = path.resolve(tmp_dir_name, self.name, files_dir_name);
  // where the tex files are within the archive:
  self.coverall_docs_path = path.resolve(self.files_path, code_dir_name, coverall_docs_dir_name);
}

// Archive.prototype.make = Promise.method(function() {
Archive.prototype.make = Promise.method(function() {
  var self = this;
  return self._prepareFilesDir()
    .then(self._copyFiles.bind(self))
    .then(self._writeArchive.bind(self))
    .then(self._delTmpDir.bind(self));
});

Archive.prototype.saveToCloud = function() {
  // upload it to s3
  // done();
};

// ********************************
// * Private functions
// ********************************

Archive.prototype._prepareFilesDir = function() {
  var self = this;
  return fs.emptyDirAsync(self.tmp_path);
};

Archive.prototype._copyFiles = function() {
  var self = this;
  var sources = {
    tex_letter_path: path.resolve(self.tex_letter_path, '..'),
    tex_resume_path: path.resolve(self.tex_resume_path, '..'),
    tex_letter_shared_path: path.resolve(self.tex_letter_path, '../../shared'),
    pdf_package_path: self.pdf_package_path
  };
  var destinations = {
    letter_path: path.resolve(self.coverall_docs_path, 'coverletters', self.recipient_name.toLowerCase()),
    resume_path: path.resolve(self.coverall_docs_path, 'resume'),
    letter_shared_path: path.resolve(self.coverall_docs_path, 'coverletters/shared'),
    pdf_package_path: path.resolve(self.files_path, 'pdf', self.recipient_name.toLowerCase() + '.pdf'),
    coverall_repo_path: path.resolve(self.files_path, 'code/coverall')
  };
  var filters = {
    tex: function(filename) {
      var contains_dot = /\./gm;
      var hidden = /\/\./gm;
      var cls_or_tex_file = /\.(cls|tex)$/gm;
      var is_a_dir = !contains_dot.test(filename);
      var is_not_hidden = (contains_dot.test(filename) && !hidden.test(filename));
      var is_cls_or_tex = cls_or_tex_file.test(filename);
      // it doesn't contain a dot or it isn't a hidden file or it is a cls/tex file
      var is_allowed = is_a_dir || is_not_hidden || is_cls_or_tex;
      return is_allowed;
    },
    pdf: /[^\.].*\.pdf/
  };

  var copyLetter = function() {
    return fs.copyAsync(sources.tex_letter_path, destinations.letter_path, { filter: filters.tex });
  };
  function copyShared() {
    return fs.copyAsync(sources.tex_letter_shared_path, destinations.letter_shared_path, { filter: filters.tex });
  }
  function copyResume() {
    return fs.copyAsync(sources.tex_resume_path, destinations.resume_path, { filter: filters.tex });
  }
  function copyPdf() {
    return fs.copyAsync(sources.pdf_package_path, destinations.pdf_package_path, { filter: filters.pdf });
  }
  function copyJs() {
    return clone('https://github.com/coaxial/coverall.git', destinations.coverall_repo_path);
  }


  return Promise.all([
      copyLetter(),
      copyShared(),
      copyResume(),
      copyPdf(),
      copyJs()
  ]);
};

Archive.prototype._writeArchive = function() {
  var self = this;
  var gzip = zlib.createGzip();
  var archive_dir_path = path.resolve(self.output_path, '..');
  var tarPromise = function() {
    return new Promise(function(resolve, reject) {
      tar.pack(self.files_path)
        .pipe(gzip)
        .pipe(fs.createWriteStream(self.output_path))
        .on('error', reject)
        .on('finish', resolve);
    });
  };

  return fs.ensureDirAsync(archive_dir_path)
    .then(tarPromise);
};

Archive.prototype._delTmpDir = function() {
  var self = this;

  return globAsync(self.tmp_path)
    .each(function(filename) {
      return fs.chmodAsync(filename, '755')
    })
    .then(function() { return fs.removeAsync(self.tmp_path); });
};
