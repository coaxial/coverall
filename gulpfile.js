var gulp = require('gulp');
var mocha = require('gulp-mocha');
var gutil = require('gulp-util');
var jshint = require('gulp-jshint');
var console = require('better-console');
var runSequence = require('run-sequence');
var istanbul = require('gulp-istanbul');

var spec_files = ['test/**/*_spec.js'];
var every_js_file = ['lib/**/*.js', 'helpers/**/*.js', 'test/**/*.js', 'index.js'];
var coverage_report_dir = 'test/coverage';
var mocha_reporter = 'list';

gulp.task('mocha', function() {
  return gulp.src(spec_files, { read: false })
    .pipe(mocha({ reporter: mocha_reporter }));
});

gulp.task('mocha-istanbul', function(cb) {
  gulp.src(every_js_file)
    .pipe(istanbul({ includeUntested: true }))
    .pipe(istanbul.hookRequire())
    .on('finish', function () {
      gulp.src(spec_files)
        .pipe(mocha({ reporter: mocha_reporter }))
        .pipe(istanbul.writeReports( { reporters: ['html', 'text'] }))
        .on('end', cb);
    });
});

gulp.task('dev', function() {
  gulp.watch(every_js_file, ['test'], { read: false });
});

gulp.task('lint', function(cb) {
  return gulp.src(every_js_file)
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'));
    cb(err);
});

gulp.task('clear-console', function() {
  return console.clear();
});

gulp.task('test', function(cb) {
  runSequence('clear-console',
              'lint',
              'mocha-istanbul',
              cb);
});

