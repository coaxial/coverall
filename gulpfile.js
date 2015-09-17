var gulp = require('gulp');
var mocha = require('gulp-mocha');
var gutil = require('gulp-util');
var jshint = require('gulp-jshint');

gulp.task('mocha', ['lint'], function() {
  return gulp.src(['test/**/*.js'], {read: false})
    .pipe(mocha({ reporter: 'list' }))
});

gulp.task('dev', function() {
  gulp.watch(['lib/**', 'helpers/**', 'test/**', 'index.js'], ['mocha'], {read: false});
});

gulp.task('lint', function() {
  return gulp.src(['lib/**/*.js', 'helpers/**/*.js', 'test/**/*.js', 'index.js'])
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'));
});
