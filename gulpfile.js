var gulp = require('gulp');
var mocha = require('gulp-mocha');
var gutil = require('gulp-util');
var eslint = require('gulp-eslint');
var console = require('better-console');
var runSequence = require('run-sequence');
var istanbul = require('gulp-istanbul');
var insert = require('gulp-insert');

var spec_files = 'test/**/*_spec.js';
var integration_files = 'test/**/*_integration.js';
var code_files = ['lib/**/*.js', 'helpers/**/*.js', 'index.js'];
var all_files = code_files.concat(spec_files, integration_files);
var coverage_report_dir = 'test/coverage';
var mocha_reporter = 'list';
var eslint_mocha_header = '/*eslint-env mocha */\n';

gulp.task('mocha', function() {
  return gulp.src(spec_files, { read: false })
    .pipe(mocha({ reporter: mocha_reporter }));
});

gulp.task('cov', function(cb) {
  return gulp.src(code_files)
    .pipe(istanbul({ includeUntested: true }))
    .pipe(istanbul.hookRequire())
    .on('finish', function () {
      gulp.src([spec_files, integration_files])
        .pipe(mocha({ reporter: 'dot' }))
        .on('error', function(err) {
          console.log('Error in tests, not checking coverage.');
          return cb(err);
        })
        .pipe(istanbul.writeReports( { reporters: ['html', 'text', 'text-summary'] }))
        .on('end', function() { return cb; });
    });
});

gulp.task('dev', function() {
  gulp.watch(all_files, ['test'], { read: false });
});

gulp.task('lint', function() {
  return gulp.src(all_files)
    .pipe(eslint({ useEslintrc: true }))
    .pipe(eslint.format());

});

gulp.task('clear-console', function() {
  return console.clear();
});

gulp.task('eslint-add-mocha-headers', function() {
  var truncated_header = eslint_mocha_header.substring(0, eslint_mocha_header.length - 1);
  // turn the header into a regex so if I update the header, this task doesn't break
  var header_regex = new RegExp('^' + truncated_header.replace(/\*/gi, '\\*').replace(/\//gi, '\\/'));

  return gulp.src(spec_files)
    .pipe(insert.transform(function(contents, file) {
      if (contents.match(header_regex)) {
        return contents;
      }
      return eslint_mocha_header + contents;
    }))
    .pipe(gulp.dest('test/'));
});

gulp.task('test', function(cb) {
  return runSequence(
      'clear-console',
      'eslint-add-mocha-headers',
      'lint',
      'mocha',
      cb);
});

gulp.task('travis', function() {
  return runSequence(
      'lint',
      'cov');
});
