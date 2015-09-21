var gulp = require('gulp');
var mocha = require('gulp-mocha');
var gutil = require('gulp-util');
var eslint = require('gulp-eslint');
var console = require('better-console');
var runSequence = require('run-sequence');
var istanbul = require('gulp-istanbul');
var insert = require('gulp-insert');

var spec_files = ['test/**/*_spec.js'];
var every_js_file = ['lib/**/*.js', 'helpers/**/*.js', 'test/**/*.js', 'index.js'];
var coverage_report_dir = 'test/coverage';
var mocha_reporter = 'list';
var eslint_mocha_header = '/*eslint-env mocha */\n';

gulp.task('mocha', function() {
  return gulp.src(spec_files, { read: false })
    .pipe(mocha({ reporter: mocha_reporter }));
});

gulp.task('cov', function(cb) {
  gulp.src(every_js_file)
    .pipe(istanbul({ includeUntested: true }))
    .pipe(istanbul.hookRequire())
    .on('finish', function () {
      gulp.src(spec_files)
        .pipe(mocha({ reporter: 'dot' }))
        .on('error', function(err) {
          console.log('Error in tests, not checking coverage.');
          cb(err);
        })
        .pipe(istanbul.writeReports( { reporters: ['html', 'text', 'text-summary'] }))
        .on('end', cb);
    });
});

gulp.task('dev', function() {
  gulp.watch(every_js_file, ['test'], { read: false });
});

gulp.task('lint', ['eslint-add-mocha-headers'], function(cb) {
  return gulp.src(every_js_file)
    .pipe(eslint())
    .pipe(eslint.format())
    cb(err);
});

gulp.task('clear-console', function() {
  return console.clear();
});

gulp.task('eslint-add-mocha-headers', function(cb) {
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
  runSequence('clear-console',
              'lint',
              'mocha',
              cb);
});

